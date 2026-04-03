/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { LogsManifest } from '@kbn/synthtrace/src/lib/service_graph_logs/types';
import type { SeedContext, SeedScenario, SeededQuery } from '../types';
import { buildFeaturePayloads } from './seed_features';
import { buildInsightPayloads } from './seed_insights';

// Task type / id constants — must stay in sync with the server-side task definitions.
const FEATURES_TASK_TYPE = 'streams_features_identification';
const QUERIES_TASK_TYPE = 'streams_significant_events_queries_generation';
const ONBOARDING_TASK_TYPE = 'streams_onboarding';
const INSIGHTS_TASK_TYPE = 'streams_insights_discovery';

/** Returns the canonical task doc IDs for a given stream. Single source of truth for both
 *  seedTasks (which creates them) and cleanTasks (which deletes them). */
function taskDocIds(streamName: string): string[] {
  return [
    `${FEATURES_TASK_TYPE}_${streamName}`,
    `${QUERIES_TASK_TYPE}_${streamName}`,
    `${ONBOARDING_TASK_TYPE}_${streamName}`,
    `${INSIGHTS_TASK_TYPE}_${streamName}`,
  ];
}

const TEMP_SEED_USER = 'seed_sigevents_tasks_tmp';
const TEMP_SEED_PASSWORD = 'seed_sigevents_tasks_tmp_pass!';

/**
 * Creates a temporary ES user with system_indices_superuser role (required to write/delete
 * .kibana_streams_tasks), runs fn with a client authenticated as that user, then deletes
 * the user in a finally block.
 *
 * Crash safety: if the process dies between putUser and deleteUser, the temp account leaks.
 * Run with --clean to delete it on the next invocation.
 */
async function withTempSuperuser<T>(
  esClient: Client,
  ctx: SeedContext,
  log: ToolingLog,
  fn: (sysClient: Client) => Promise<T>
): Promise<T> {
  const { Client: EsClient } = await import('@elastic/elasticsearch');
  try {
    await esClient.security.putUser({
      username: TEMP_SEED_USER,
      password: TEMP_SEED_PASSWORD,
      roles: ['system_indices_superuser'],
    });
    log.info(
      `withTempSuperuser: created temp user "${TEMP_SEED_USER}" with system_indices_superuser role`
    );
    const sysClient = new EsClient({
      node: ctx.esUrl,
      auth: { username: TEMP_SEED_USER, password: TEMP_SEED_PASSWORD },
    });
    return await fn(sysClient);
  } finally {
    try {
      await esClient.security.deleteUser({ username: TEMP_SEED_USER });
      log.info(`withTempSuperuser: deleted temp user "${TEMP_SEED_USER}"`);
    } catch (err) {
      log.warning(
        `withTempSuperuser: failed to delete temp user "${TEMP_SEED_USER}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}

/** Build all 4 task doc objects for a seed run. */
function buildTaskDocs(
  ctx: SeedContext,
  manifest: LogsManifest,
  scenario: SeedScenario,
  seededQueries: SeededQuery[],
  log: ToolingLog
) {
  // Re-uses shared builders so the task payload matches what was indexed/POSTed by the
  // individual seed steps. Features include uuid (from buildFeaturePayloads). Insights use
  // ctx.generatedAt — same value passed to seedInsights — so both storage paths stay in sync.
  const features = buildFeaturePayloads(ctx, manifest);

  const queries = seededQueries.map((q) => ({
    title: q.title,
    esql: { query: q.esql },
    ...(q.severityScore !== undefined ? { severity_score: q.severityScore } : {}),
    description: q.description ?? '',
    evidence: [],
  }));

  const insights = buildInsightPayloads(ctx, scenario, seededQueries);

  // --- task doc builders -------------------------------------------------------
  const baseTask = (
    id: string,
    type: string,
    params: Record<string, unknown>,
    payload: unknown
  ) => ({
    id,
    type,
    status: 'completed',
    space: '*',
    created_at: ctx.generatedAt,
    last_completed_at: ctx.generatedAt,
    task: { params, payload },
  });

  const tokensZero = { prompt: 0, completion: 0 };

  const [featuresId, queriesId, onboardingId, insightsId] = taskDocIds(ctx.streamName);

  return [
    baseTask(
      featuresId,
      FEATURES_TASK_TYPE,
      { streamName: ctx.streamName, start: 0, end: 0 },
      { features }
    ),
    baseTask(
      queriesId,
      QUERIES_TASK_TYPE,
      { streamName: ctx.streamName, start: 0, end: 0 },
      { queries, tokensUsed: tokensZero }
    ),
    baseTask(
      onboardingId,
      ONBOARDING_TASK_TYPE,
      {
        streamName: ctx.streamName,
        from: 0,
        to: 0,
        steps: ['features_identification', 'queries_generation'],
        saveQueries: true,
      },
      {
        featuresTaskResult: { status: 'completed', features },
        queriesTaskResult: { status: 'completed', queries, tokensUsed: tokensZero },
      }
    ),
    baseTask(
      insightsId,
      INSIGHTS_TASK_TYPE,
      { streamNames: [ctx.streamName] },
      { insights, tokensUsed: { ...tokensZero, cached: 0 } }
    ),
  ];
}

export async function seedTasks(
  ctx: SeedContext,
  manifest: LogsManifest,
  scenario: SeedScenario,
  seededQueries: SeededQuery[],
  esClient: Client,
  log: ToolingLog
): Promise<void> {
  await withTempSuperuser(esClient, ctx, log, async (sysClient) => {
    const taskDocs = buildTaskDocs(ctx, manifest, scenario, seededQueries, log);
    for (const doc of taskDocs) {
      await sysClient.index({
        index: '.kibana_streams_tasks',
        id: doc.id,
        document: doc,
        refresh: 'wait_for',
      });
      log.info(`seedTasks: indexed task doc "${doc.id}"`);
    }
  });
}

export async function cleanTasks(
  ctx: SeedContext,
  esClient: Client,
  log: ToolingLog
): Promise<void> {
  await withTempSuperuser(esClient, ctx, log, async (sysClient) => {
    for (const id of taskDocIds(ctx.streamName)) {
      try {
        await sysClient.delete({
          index: '.kibana_streams_tasks',
          id,
          refresh: 'wait_for',
        } as Parameters<Client['delete']>[0]);
        log.info(`cleanTasks: deleted task doc "${id}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('not_found') && !msg.includes('index_not_found')) throw err;
      }
    }
  });
}
