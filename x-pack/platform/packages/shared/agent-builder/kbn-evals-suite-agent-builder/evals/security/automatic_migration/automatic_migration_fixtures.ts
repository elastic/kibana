/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';

const MIGRATIONS_INDEX = '.kibana-siem-rule-migrations-migrations-default';
const RULES_INDEX = '.kibana-siem-rule-migrations-rules-default';
const RESOURCES_INDEX = '.kibana-siem-rule-migrations-resources-default';

export interface SeededMigrationFixtures {
  migrationId: string;
  migrationName: string;
  ruleCounts: {
    total: number;
    completed: number;
    partial: number;
    untranslatable: number;
    failed: number;
    pending: number;
  };
}

interface SeedOptions {
  esClient: EsClient;
  log: ToolingLog;
  name?: string;
  /** Fully translated completed rules (translation_result: 'full') */
  completed?: number;
  /** Partially translated rules (translation_result: 'partial', status: 'completed') */
  partial?: number;
  /** Untranslatable rules (translation_result: 'untranslatable', status: 'completed') */
  untranslatable?: number;
  failed?: number;
  pending?: number;
  /** Seed `last_execution.is_stopped: true` to produce a STOPPED migration status. */
  isStopped?: boolean;
  vendor?: string;
}

interface SeedResult {
  fixtures: SeededMigrationFixtures;
  cleanup: () => Promise<void>;
}

/**
 * Seeds missing resources (no content field → hasContent: false) for a given migration.
 * Returns a cleanup function that deletes the seeded resource docs.
 */
export async function seedMissingResources({
  esClient,
  log,
  migrationId,
  resources,
}: {
  esClient: EsClient;
  log: ToolingLog;
  migrationId: string;
  resources: Array<{ type: string; name: string }>;
}): Promise<() => Promise<void>> {
  const operations = resources.flatMap((r) => [
    { create: { _index: RESOURCES_INDEX } },
    { migration_id: migrationId, type: r.type, name: r.name },
  ]);
  await esClient.bulk({ refresh: 'wait_for', operations });
  log.info(
    `[automatic-migration-eval] seeded ${resources.length} missing resources for migration ${migrationId}`
  );
  return async () => {
    try {
      await esClient.deleteByQuery({
        index: RESOURCES_INDEX,
        query: { term: { migration_id: migrationId } },
        refresh: true,
        ignore_unavailable: true,
      });
      log.info('[automatic-migration-eval] cleaned up seeded missing resources');
    } catch (err) {
      log.warning(
        `[automatic-migration-eval] resource cleanup failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };
}

export async function seedRuleMigration({
  esClient,
  log,
  name = 'Splunk Q1',
  completed = 2,
  partial = 0,
  untranslatable = 0,
  failed = 1,
  pending = 0,
  isStopped = false,
  vendor = 'splunk',
}: SeedOptions): Promise<SeedResult> {
  try {
    const migrationId = randomUUID();
    const total = completed + partial + untranslatable + failed + pending;
    const now = new Date().toISOString();

    interface RuleSpec {
      status: string;
      translation_result?: string;
      title: string;
    }
    const ruleSpecs: RuleSpec[] = [
      ...Array.from({ length: failed }, (_, i) => ({
        status: 'failed',
        title: `Eval rule failed ${i + 1}`,
      })),
      ...Array.from({ length: pending }, (_, i) => ({
        status: 'pending',
        title: `Eval rule pending ${i + 1}`,
      })),
      ...Array.from({ length: completed }, (_, i) => ({
        status: 'completed',
        translation_result: 'full',
        title: `Eval rule completed ${i + 1}`,
      })),
      ...Array.from({ length: partial }, (_, i) => ({
        status: 'completed',
        translation_result: 'partial',
        title: `Eval rule partial ${i + 1}`,
      })),
      ...Array.from({ length: untranslatable }, (_, i) => ({
        status: 'completed',
        translation_result: 'untranslatable',
        title: `Eval rule untranslatable ${i + 1}`,
      })),
    ];

    const ruleDocs = ruleSpecs.flatMap(({ status, translation_result, title }) => [
      { create: { _index: RULES_INDEX } },
      {
        '@timestamp': now,
        migration_id: migrationId,
        original_rule: {
          id: randomUUID(),
          vendor,
          title,
          description: 'Test rule for eval seeding',
          query: '| search index=main',
          query_language: 'spl',
        },
        status,
        ...(translation_result ? { translation_result } : {}),
        updated_at: now,
      },
    ]);

    await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        { create: { _index: MIGRATIONS_INDEX, _id: migrationId } },
        {
          name,
          created_by: 'eval-user',
          created_at: now,
          ...(isStopped
            ? {
                last_execution: {
                  is_stopped: true,
                  started_at: now,
                  finished_at: now,
                  connector_id: 'eval-connector',
                  skip_prebuilt_rules_matching: false,
                },
              }
            : {}),
        },
        ...ruleDocs,
      ],
    });

    log.info(
      `[automatic-migration-eval] seeded migration "${name}" (${migrationId}) with ${total} rules`
    );

    return {
      fixtures: {
        migrationId,
        migrationName: name,
        ruleCounts: { total, completed, partial, untranslatable, failed, pending },
      },
      cleanup: async () => {
        try {
          await esClient.deleteByQuery({
            index: [MIGRATIONS_INDEX, RULES_INDEX],
            query: { match_all: {} },
            refresh: true,
            ignore_unavailable: true,
          });
          log.info('[automatic-migration-eval] cleaned up seeded migration data');
        } catch (err) {
          log.warning(
            `[automatic-migration-eval] cleanup failed: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      },
    };
  } catch (err) {
    const message = `[automatic-migration-eval] could not seed migration data: ${
      err instanceof Error ? err.message : String(err)
    }`;
    log.warning(message);
    throw err instanceof Error ? err : new Error(message);
  }
}
