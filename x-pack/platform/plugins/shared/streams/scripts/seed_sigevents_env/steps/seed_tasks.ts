/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { LogsManifest } from '@kbn/synthtrace/src/lib/service_graph_logs/types';
import { STREAMS_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { SeedContext, SeedScenario, SeededQuery } from '../types';
import { deterministicId } from '../types';
import { buildFeaturePayloads, buildInsightPayloads } from '../lib/builders';

const INSIGHTS_TASK_TYPE = 'streams_insights_discovery';

const WORKFLOWS_EXECUTIONS_INDEX = '.workflows-executions';

const TEMP_SEED_USER = 'seed_sigevents_tasks_tmp';
const TEMP_SEED_PASSWORD = 'seed_sigevents_tasks_tmp_pass!';

/**
 * Creates a temporary ES user with system_indices_superuser role (required to write/delete
 * .kibana_streams_tasks), runs fn with a client authenticated as that user, then deletes
 * the user in a finally block.
 *
 * Crash safety: if the process dies between putUser and deleteUser, the temp account leaks.
 * The pre-flight delete below handles stale users from previous crashed runs. If you need
 * to clean up manually: DELETE /_security/user/seed_sigevents_tasks_tmp
 */
async function withTempSuperuser<T>(
  esClient: Client,
  ctx: SeedContext,
  log: ToolingLog,
  fn: (sysClient: Client) => Promise<T>
): Promise<T> {
  // Pre-flight: remove any stale user left by a previous crashed run.
  try {
    await esClient.security.deleteUser({ username: TEMP_SEED_USER });
    log.debug(`withTempSuperuser: removed stale temp user "${TEMP_SEED_USER}" from previous run`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('not_found') && !msg.includes('404')) {
      log.debug(`withTempSuperuser: pre-flight deleteUser failed: ${msg}`);
    }
  }

  try {
    await esClient.security.putUser({
      username: TEMP_SEED_USER,
      password: TEMP_SEED_PASSWORD,
      roles: ['system_indices_superuser'],
    });
    log.info(
      `withTempSuperuser: created temp user "${TEMP_SEED_USER}" with system_indices_superuser role`
    );
    const sysClient = new Client({
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

function seedOnboardingExecutionId(streamName: string): string {
  return deterministicId('seed-onboarding', streamName);
}

function buildWorkflowExecutionDoc(
  ctx: SeedContext,
  manifest: LogsManifest,
  seededQueries: SeededQuery[]
) {
  const features = buildFeaturePayloads(ctx, manifest);
  const queries = seededQueries.map((q) => ({
    title: q.title,
    esql: { query: q.esql },
    ...(q.severityScore !== undefined ? { severity_score: q.severityScore } : {}),
    description: q.description ?? '',
    evidence: [],
  }));
  const tokensZero = { prompt: 0, completion: 0 };
  const executionId = seedOnboardingExecutionId(ctx.streamName);

  return {
    id: executionId,
    spaceId: 'default',
    workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
    status: 'completed',
    isTestRun: false,
    createdAt: ctx.generatedAt,
    startedAt: ctx.generatedAt,
    finishedAt: ctx.generatedAt,
    duration: 5000,
    triggeredBy: 'manual',
    executedBy: 'elastic',
    concurrencyGroupKey: `streams-ki-onboarding-${ctx.streamName}`,
    context: {
      inputs: { streamName: ctx.streamName },
      output: {
        streamName: ctx.streamName,
        featuresSkipped: false,
        featuresConnectorUsed: '',
        discoveredFeatures: features,
        featuresTokensUsed: tokensZero,
        queriesSkipped: false,
        queriesConnectorUsed: '',
        persistedQueries: queries,
        queriesTokensUsed: tokensZero,
      },
    },
    workflowDefinition: {},
    yaml: '',
    error: null,
    cancelRequested: false,
    scopeStack: [],
  };
}

/** Build task doc objects for a seed run (insights only — features/queries/onboarding
 *  are now handled by workflows, not Task Manager). */
function buildTaskDocs(ctx: SeedContext, scenario: SeedScenario, seededQueries: SeededQuery[]) {
  const insights = buildInsightPayloads(ctx, scenario, seededQueries);
  const tokensZero = { prompt: 0, completion: 0 };

  return [
    {
      id: INSIGHTS_TASK_TYPE,
      type: INSIGHTS_TASK_TYPE,
      status: 'completed',
      space: '*',
      created_at: ctx.generatedAt,
      last_completed_at: ctx.generatedAt,
      task: {
        params: { streamNames: [ctx.streamName] },
        payload: { insights, tokensUsed: { ...tokensZero, cached: 0 } },
      },
    },
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
  // Insights task docs go into the system index (requires superuser)
  await withTempSuperuser(esClient, ctx, log, async (sysClient) => {
    const taskDocs = buildTaskDocs(ctx, scenario, seededQueries);
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

  // Onboarding workflow execution doc (regular index, no superuser needed)
  const wfDoc = buildWorkflowExecutionDoc(ctx, manifest, seededQueries);
  await esClient.index({
    index: WORKFLOWS_EXECUTIONS_INDEX,
    id: wfDoc.id,
    document: wfDoc,
    refresh: 'wait_for',
  });
  log.info(`seedTasks: indexed workflow execution doc "${wfDoc.id}"`);
}

export async function cleanTasks(
  ctx: SeedContext,
  esClient: Client,
  log: ToolingLog
): Promise<void> {
  await withTempSuperuser(esClient, ctx, log, async (sysClient) => {
    const ids = [INSIGHTS_TASK_TYPE];
    await Promise.all(
      ids.map(async (id) => {
        try {
          await sysClient.delete({
            index: '.kibana_streams_tasks',
            id,
            refresh: 'wait_for',
          } as Parameters<Client['delete']>[0]);
          log.info(`cleanTasks: deleted task doc "${id}"`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('not_found') && !msg.includes('index_not_found')) {
            throw err;
          }
        }
      })
    );
  });

  // Clean seeded workflow execution doc (regular index, no superuser needed)
  const wfId = seedOnboardingExecutionId(ctx.streamName);
  try {
    await esClient.delete({
      index: WORKFLOWS_EXECUTIONS_INDEX,
      id: wfId,
      refresh: 'wait_for',
    });
    log.info(`cleanTasks: deleted workflow execution doc "${wfId}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('not_found') && !msg.includes('index_not_found')) {
      throw err;
    }
  }
}
