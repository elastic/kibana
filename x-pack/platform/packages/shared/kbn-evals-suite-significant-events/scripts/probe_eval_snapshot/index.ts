/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { Client } from '@elastic/elasticsearch';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  replaySignificantEventsSnapshot,
  listAvailableSnapshots,
} from '../../src/data_generators/replay';
import type { GcsConfig } from '../../src/data_generators/replay';
import { getDatasetById, getAllDatasetIds } from '../../src/datasets';
import { readKibanaConfig } from '../lib/kibana';

const MANAGED_STREAM_SEARCH_PATTERN = 'logs*';

const COMMAND_WORD = 'PROBE';

interface EsqlResult {
  columns: string[];
  rows: unknown[][];
}

const runEsql = async (esClient: Client, query: string): Promise<EsqlResult> => {
  const response = await esClient.esql.query(
    { query, format: 'json' },
    { requestTimeout: 120_000 }
  );
  const columns = (response.columns ?? []).map((column) => column.name);
  return { columns, rows: (response.values ?? []) as unknown[][] };
};

const flattenKeys = (doc: Record<string, unknown>, prefix = ''): string[] => {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(doc)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
};

run(
  async ({ log, flags }) => {
    const datasetIds = getAllDatasetIds();
    const datasetId = String(flags.dataset || 'all');

    if (datasetId === 'list') {
      log.info(`Registered datasets: ${datasetIds.join(', ')}`);
      return;
    }

    const datasetsToProbe =
      datasetId === 'all'
        ? datasetIds
        : datasetId
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

    const unknownIds = datasetsToProbe.filter((id) => !datasetIds.includes(id));
    if (unknownIds.length > 0) {
      throw new Error(
        `Unknown dataset id(s): ${unknownIds.join(', ')}\nRegistered datasets: ${datasetIds.join(
          ', '
        )}`
      );
    }

    if (datasetsToProbe.length === 0) {
      throw new Error(`No dataset selected. Pass --dataset <id[,id]>, "all", or "list".`);
    }

    const scenario = String(flags.scenario || '');
    if (!scenario) {
      throw new Error(
        'Required: --scenario <name>\nExamples: --scenario healthy-baseline, --scenario ledger-db-disconnect'
      );
    }

    const kibanaConfig = readKibanaConfig(log);
    const { elasticsearch } = kibanaConfig;

    const esUrl = String(
      flags['es-url'] ||
        (Array.isArray(elasticsearch.hosts) ? elasticsearch.hosts[0] : elasticsearch.hosts)
    );
    const username = String(flags['es-username'] || elasticsearch.username);
    const password = String(flags['es-password'] || elasticsearch.password);

    const esClient = new Client({
      node: esUrl,
      auth: { username, password },
    });

    const esqlProbes = (
      Array.isArray(flags.esql) ? flags.esql : flags.esql ? [flags.esql] : []
    ).map(String);

    const modes = (Array.isArray(flags.mode) ? flags.mode : flags.mode ? [flags.mode] : []).map(
      String
    );

    log.info(`Run: ${SIGEVENTS_SNAPSHOT_RUN} | ES: ${esUrl}`);
    log.info(`Datasets: ${datasetsToProbe.join(', ')} | Scenario: ${scenario}`);
    log.info(`ES|QL probes: ${esqlProbes.length} | Modes: ${modes.join(', ') || '(none)'}`);

    for (const id of datasetsToProbe) {
      const datasetConfig = getDatasetById(id);
      if (!datasetConfig) {
        throw new Error(`Dataset "${id}" is registered but has no config`);
      }

      const gcs: GcsConfig = datasetConfig.gcs;
      const available = await listAvailableSnapshots(esClient, log, gcs);
      if (!available.includes(scenario)) {
        log.warning(
          `Snapshot "${scenario}" not found for dataset "${id}" in run "${SIGEVENTS_SNAPSHOT_RUN}". ` +
            `Available: ${available.join(', ')}`
        );
        continue;
      }

      log.info(`${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} replaysnapshot=true`);

      await replaySignificantEventsSnapshot(esClient, log, scenario, gcs);
      await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });

      const countResult = await esClient.count({ index: MANAGED_STREAM_SEARCH_PATTERN });
      log.info(
        `${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} total_docs=${countResult.count}`
      );

      if (modes.includes('fields')) {
        const sample = await esClient.search<Record<string, unknown>>({
          index: MANAGED_STREAM_SEARCH_PATTERN,
          size: 1,
        });
        const source = sample.hits.hits[0]?._source;
        const keys = source ? flattenKeys(source).sort() : [];
        log.info(
          `${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} fields=${JSON.stringify(keys)}`
        );
      }

      if (modes.includes('mapping')) {
        const mappingResponse = await esClient.indices.getMapping({
          index: MANAGED_STREAM_SEARCH_PATTERN,
        });
        const fieldNames = new Set<string>();
        const collectFields = (properties: Record<string, unknown>, prefix = ''): void => {
          for (const [key, value] of Object.entries(properties ?? {})) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            fieldNames.add(fullKey);
            const props = (value as { properties?: Record<string, unknown> })?.properties;
            if (props) {
              collectFields(props, fullKey);
            }
          }
        };
        for (const definition of Object.values(mappingResponse)) {
          collectFields((definition.mappings?.properties ?? {}) as Record<string, unknown>);
        }
        const durationish = [...fieldNames]
          .filter((key) =>
            /duration|latency|elapsed|millis|response_time|processing|time\b/i.test(key)
          )
          .sort();
        log.info(
          `${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} duration_family_fields=${JSON.stringify(
            durationish
          )}`
        );
        log.info(
          `${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} mapping_field_count=${fieldNames.size}`
        );
      }

      if (modes.includes('patterns')) {
        const result = await runEsql(
          esClient,
          `FROM ${MANAGED_STREAM_SEARCH_PATTERN} | STATS c = COUNT(*) BY pattern = LEFT(TO_STRING(body.text), 100) | SORT c DESC | LIMIT 30`
        );
        log.info(
          `${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} top_patterns=${JSON.stringify(
            result.rows.map((row) => ({ pattern: row[1], count: row[0] }))
          )}`
        );
      }

      for (const query of esqlProbes) {
        try {
          const result = await runEsql(esClient, query);
          log.info(
            `${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} rows=${result.rows.length} ` +
              `columns=${JSON.stringify(result.columns)} values=${JSON.stringify(result.rows)}`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          log.warning(
            `${COMMAND_WORD} @@ dataset=${id} scenario=${scenario} esql_error=${JSON.stringify(
              message
            )}`
          );
        }
      }
    }

    log.info('PROBE COMPLETE');
  },
  {
    description: `
      Replay a snapshot and run read-only ES|QL probes against the replayed data.

      Replays each requested dataset's snapshot into "logs*" using the exact
      replay path the evaluation specs use, then runs the passed ES|QL queries
      and/or structural inspection modes.

      Useful for verifying evaluation criteria ground truth against snapshot
      data (seed query hits, duration field coverage, routine-success log
      patterns) without invoking any LLM.

      Example:
        node scripts/probe_sigevents_eval_snapshot.js \\
          --dataset otel-demo --scenario healthy-baseline --mode fields --mode patterns \\
          --esql 'FROM logs* | STATS total = COUNT(*)'
    `,
    flags: {
      string: [
        'dataset',
        'scenario',
        'esql',
        'mode',
        'run-id',
        'es-url',
        'es-username',
        'es-password',
      ],
      array: ['esql', 'mode'],
      help: `
        --dataset         Dataset id to probe, comma-separated list, "all", or "list"
                          to print the registered ids (default: all)
        --scenario        (required) Scenario snapshot to replay for each dataset
        --mode            Inspection mode, repeatable: fields (sample-doc leaf keys),
                          mapping (duration-family mapping fields), patterns (top body.text)
        --esql            ES|QL probe query, repeatable; run against "logs*" after replay
        --run-id          Snapshot run ID (default: SIGEVENTS_SNAPSHOT_RUN env or pinned constant)
        --es-url          Elasticsearch URL (default: from kibana.dev.yml)
        --es-username     ES username (default: from kibana.dev.yml)
        --es-password     ES password (default: from kibana.dev.yml)
      `,
    },
  }
);
