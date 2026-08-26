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

export interface SeededMigrationFixtures {
  migrationId: string;
  migrationName: string;
  ruleCounts: { total: number; completed: number; failed: number; pending: number };
}

interface SeedOptions {
  esClient: EsClient;
  log: ToolingLog;
  name?: string;
  completed?: number;
  failed?: number;
  pending?: number;
}

interface SeedResult {
  fixtures: SeededMigrationFixtures;
  cleanup: () => Promise<void>;
}

export async function seedRuleMigration({
  esClient,
  log,
  name = 'Splunk Q1',
  completed = 2,
  failed = 1,
  pending = 0,
}: SeedOptions): Promise<SeedResult> {
  try {
    const migrationId = randomUUID();
    const total = completed + failed + pending;
    const now = new Date().toISOString();

    const statuses = [
      ...Array<string>(failed).fill('failed'),
      ...Array<string>(pending).fill('pending'),
      ...Array<string>(completed).fill('completed'),
    ];

    const ruleDocs = statuses.flatMap((status) => [
      { create: { _index: RULES_INDEX } },
      {
        '@timestamp': now,
        migration_id: migrationId,
        original_rule: {
          id: randomUUID(),
          vendor: 'splunk',
          title: `Eval rule ${status}`,
          description: 'Test rule for eval seeding',
          query: '| search index=main',
          query_language: 'spl',
        },
        status,
        updated_at: now,
      },
    ]);

    await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        { create: { _index: MIGRATIONS_INDEX, _id: migrationId } },
        { name, created_by: 'eval-user', created_at: now },
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
        ruleCounts: { total, completed, failed, pending },
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
