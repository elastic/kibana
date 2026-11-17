/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import yargs from 'yargs';
import { CaseStatuses } from '../../common/types/domain';
import { CASE_INDEX_NAME } from '../../server/cases_analytics_v2/constants';
import { createEsClient } from '../cases_generator/clients';
import { logger } from '../cases_generator/logger';
import { installSeededRandom, rng } from '../cases_generator/seeded_random';
import { AUTO_GENERATED_TAG } from '../cases_generator/utils';
import type { DemoCaseTimeFields } from './timeline';
import { buildDemoTimeline, getDemoCaseTimeFields } from './timeline';

const PAGE_SIZE = 500;
const PIT_KEEP_ALIVE = '1m';

interface CaseUser {
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  profile_uid?: string;
}

interface CaseSource {
  cases: { created_by?: CaseUser };
  namespaces?: string[];
}

const parseArgs = () =>
  yargs.help().options({
    node: {
      alias: 'n',
      describe: 'Elasticsearch node URL',
      type: 'string',
      default: 'http://127.0.0.1:9200',
    },
    username: {
      alias: 'u',
      describe:
        'Elasticsearch user. The saved object index is restricted, so a superuser cannot write to it.',
      type: 'string',
      default: 'kibana_system',
    },
    password: { alias: 'p', type: 'string', default: 'changeme' },
    ssl: { type: 'boolean', default: false },
    tag: {
      describe: 'Backdate only the cases with this tag',
      type: 'string',
      default: AUTO_GENERATED_TAG,
    },
    space: { alias: 's', describe: 'Backdate only the cases of this space', type: 'string' },
    owner: { alias: 'o', describe: 'Backdate only the cases of this owner', type: 'string' },
    days: {
      describe: 'The creation dates spread over this number of past days',
      type: 'number',
      default: 60,
    },
    seed: { describe: 'Optional seed for a repeatable result', type: 'string', default: '' },
    dryRun: { describe: 'Print the plan and write nothing', type: 'boolean', default: false },
  }).argv;

const buildCaseQuery = ({
  tag,
  space,
  owner,
}: {
  tag: string;
  space?: string;
  owner?: string;
}): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { type: 'cases' } },
      { term: { 'cases.tags': tag } },
      ...(space != null ? [{ term: { namespaces: space } }] : []),
      ...(owner != null ? [{ term: { 'cases.owner': owner } }] : []),
    ],
  },
});

const toClosedBy = (fields: DemoCaseTimeFields, createdBy?: CaseUser): CaseUser | null =>
  fields.status === CaseStatuses.closed && createdBy != null ? createdBy : null;

const buildSavedObjectUpdate = (fields: DemoCaseTimeFields, createdBy?: CaseUser) => ({
  status: fields.persistedStatus,
  created_at: fields.created_at,
  updated_at: fields.updated_at,
  closed_at: fields.closed_at,
  closed_by: toClosedBy(fields, createdBy),
  in_progress_at: fields.in_progress_at,
  duration: fields.duration,
  time_to_acknowledge: fields.time_to_acknowledge,
  time_to_investigate: fields.time_to_investigate,
  time_to_resolve: fields.time_to_resolve,
});

const buildAnalyticsUpdate = (fields: DemoCaseTimeFields, createdBy?: CaseUser) => ({
  '@timestamp': fields.updated_at,
  case: {
    status: fields.status,
    created_at: fields.created_at,
    updated_at: fields.updated_at,
    closed_at: fields.closed_at,
    closed_by: toClosedBy(fields, createdBy),
    in_progress_at: fields.in_progress_at,
    duration: fields.duration,
    time_to_acknowledge: fields.time_to_acknowledge,
    time_to_investigate: fields.time_to_investigate,
    time_to_resolve: fields.time_to_resolve,
    ...fields.statusHistory,
  },
});

/**
 * Gives every matching demo case a random status time line and writes the matching time fields
 * to the case saved object and to its `.cases` analytics document.
 */
export const runBackdate = async (): Promise<void> => {
  const argv = parseArgs();
  const restoreRandom = argv.seed !== '' ? installSeededRandom(argv.seed) : undefined;
  const esClient = createEsClient({
    node: argv.node,
    ssl: argv.ssl,
    username: argv.username,
    password: argv.password,
  });
  const now = new Date();
  const query = buildCaseQuery({ tag: argv.tag, space: argv.space, owner: argv.owner });
  const scenarioCounts: Record<string, number> = {};
  let searchAfter: estypes.SortResults | undefined;
  let updatedCases = 0;
  let missingAnalyticsDocs = 0;
  const { id: pitId } = await esClient.openPointInTime({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    keep_alive: PIT_KEEP_ALIVE,
  });

  try {
    do {
      const page = await esClient.search<CaseSource>({
        pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
        size: PAGE_SIZE,
        query,
        sort: [{ _shard_doc: 'asc' }],
        _source: ['cases.created_by', 'namespaces'],
        ...(searchAfter != null && { search_after: searchAfter }),
      });
      const { hits } = page.hits;

      if (hits.length === 0) {
        break;
      }

      const operations = hits.flatMap((hit) => {
        const caseId = hit._id?.replace(/^cases:/, '') ?? '';
        const createdBy = hit._source?.cases.created_by;
        const timeline = buildDemoTimeline({ now, days: argv.days, random: rng });
        const fields = getDemoCaseTimeFields(timeline, now);

        scenarioCounts[timeline.scenario] = (scenarioCounts[timeline.scenario] ?? 0) + 1;

        return [
          { update: { _index: ALERTING_CASES_SAVED_OBJECT_INDEX, _id: hit._id } },
          { doc: { cases: buildSavedObjectUpdate(fields, createdBy) } },
          { update: { _index: CASE_INDEX_NAME, _id: caseId } },
          { doc: buildAnalyticsUpdate(fields, createdBy) },
        ];
      });

      if (!argv.dryRun) {
        const response = await esClient.bulk({ operations, refresh: 'wait_for' });

        response.items.forEach((item) => {
          const { update } = item;
          if (update?.error == null) {
            return;
          }

          if (update._index.startsWith(CASE_INDEX_NAME) && update.status === 404) {
            missingAnalyticsDocs += 1;
            return;
          }

          logger.error(`Failed to update ${update._index}/${update._id}: ${update.error.reason}`);
        });
      }

      updatedCases += hits.length;
      searchAfter = hits[hits.length - 1].sort;
    } while (searchAfter != null);
  } finally {
    restoreRandom?.();
    await esClient.closePointInTime({ id: pitId });
  }

  logger.info(
    `${argv.dryRun ? 'Planned' : 'Backdated'} ${updatedCases} cases with the tag "${argv.tag}".`
  );
  logger.info(`Scenarios: ${JSON.stringify(scenarioCounts)}`);

  if (missingAnalyticsDocs > 0) {
    logger.warning(
      `${missingAnalyticsDocs} cases have no .cases document. Run the analytics reset, then run this script again.`
    );
  }
};
