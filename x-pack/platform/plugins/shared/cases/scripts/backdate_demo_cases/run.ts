/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import yargs from 'yargs';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../common/constants';
import { AttachmentType, CaseStatuses } from '../../common/types/domain';
import { UNIFIED_ALERT_TYPES_ARRAY } from '../../common/utils/attachments';
import { ATTACHMENTS_INDEX_NAME, CASE_INDEX_NAME } from '../../server/cases_analytics_v2/constants';
import { createEsClient } from '../cases_generator/clients';
import { logger } from '../cases_generator/logger';
import { installSeededRandom, rng } from '../cases_generator/seeded_random';
import { AUTO_GENERATED_TAG } from '../cases_generator/utils';
import {
  DEMO_ALERTS_INDEX,
  DEMO_ALERT_RULE_NAME,
  DEMO_ALERT_RULE_TAG,
} from '../seed_demo_alert_attachments/demo_alert';
import type { DemoCaseTimeFields } from './timeline';
import { buildDemoAlertTimes, buildDemoTimeline, getDemoCaseTimeFields } from './timeline';

const PAGE_SIZE = 500;
const PIT_KEEP_ALIVE = '1m';
const MAX_ALERT_ATTACHMENTS = 10000;
const ALERT_ATTACHMENT_TYPES: string[] = [AttachmentType.alert, ...UNIFIED_ALERT_TYPES_ARRAY];
const ATTACHMENT_SAVED_OBJECT_TYPES = [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT];

interface BackdatedCase {
  caseId: string;
  createdAt: string;
}

interface AlertAttachmentSource {
  '@timestamp'?: string;
  case?: { id?: string };
  attachment?: { attachment_id?: string[] };
}

interface AlertAttachment {
  id: string;
  caseId: string;
  alertIds: string[];
}

interface AlertAttachmentCounts {
  attachments: number;
  alerts: number;
}

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

const searchAlertAttachments = async (
  esClient: Client,
  caseIds: string[]
): Promise<AlertAttachment[]> => {
  const { hits } = await esClient.search<AlertAttachmentSource>({
    index: ATTACHMENTS_INDEX_NAME,
    size: MAX_ALERT_ATTACHMENTS,
    query: {
      bool: {
        filter: [
          { terms: { 'case.id': caseIds } },
          { terms: { 'attachment.type': ALERT_ATTACHMENT_TYPES } },
        ],
      },
    },
    sort: [{ '@timestamp': 'asc' }],
    _source: ['case.id', 'attachment.attachment_id'],
    ignore_unavailable: true,
  });

  return hits.hits.flatMap(({ _id: id, _source: source }) => {
    const caseId = source?.case?.id;
    const alertIds = source?.attachment?.attachment_id ?? [];

    return id != null && caseId != null && alertIds.length > 0 ? [{ id, caseId, alertIds }] : [];
  });
};

/**
 * Returns the concrete index of each alert that has the demo marker, keyed by the alert id.
 */
const findDemoAlerts = async (
  esClient: Client,
  alertIds: string[]
): Promise<Map<string, string>> => {
  const { hits } = await esClient.search({
    index: DEMO_ALERTS_INDEX,
    size: alertIds.length,
    query: {
      bool: {
        filter: [
          { ids: { values: alertIds } },
          { term: { 'kibana.alert.rule.name': DEMO_ALERT_RULE_NAME } },
          { term: { 'kibana.alert.rule.tags': DEMO_ALERT_RULE_TAG } },
        ],
      },
    },
    _source: false,
    ignore_unavailable: true,
  });

  return new Map(
    hits.hits.flatMap(({ _id: id, _index: index }) => (id != null ? [[id, index]] : []))
  );
};

/**
 * Returns the saved object type of each attachment id. The attach path can write either type.
 */
const findAttachmentSavedObjectTypes = async (
  esClient: Client,
  attachmentIds: string[]
): Promise<Map<string, string>> => {
  const { docs } = await esClient.mget({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    ids: attachmentIds.flatMap((id) =>
      ATTACHMENT_SAVED_OBJECT_TYPES.map((type) => `${type}:${id}`)
    ),
    _source: false,
  });
  const types = new Map<string, string>();

  docs.forEach((doc) => {
    if ('found' in doc && doc.found) {
      const [type, ...idParts] = doc._id.split(':');
      types.set(idParts.join(':'), type);
    }
  });

  return types;
};

/**
 * Moves the attach times of the demo alert attachments of the cases, relative to the new creation
 * time of each case, and moves the start time of each demo alert before its attach time.
 * Only the attachments whose alerts all have the demo marker change.
 */
const backdateDemoAlertAttachments = async ({
  esClient,
  cases,
  now,
  dryRun,
}: {
  esClient: Client;
  cases: BackdatedCase[];
  now: Date;
  dryRun: boolean;
}): Promise<AlertAttachmentCounts> => {
  const attachments = await searchAlertAttachments(
    esClient,
    cases.map(({ caseId }) => caseId)
  );

  if (attachments.length === 0) {
    return { attachments: 0, alerts: 0 };
  }

  const demoAlerts = await findDemoAlerts(
    esClient,
    Array.from(new Set(attachments.flatMap(({ alertIds }) => alertIds)))
  );
  const demoAttachments = attachments.filter(({ alertIds }) =>
    alertIds.every((alertId) => demoAlerts.has(alertId))
  );

  if (demoAttachments.length === 0) {
    return { attachments: 0, alerts: 0 };
  }

  const savedObjectTypes = await findAttachmentSavedObjectTypes(
    esClient,
    demoAttachments.map(({ id }) => id)
  );
  const operations: estypes.BulkOperationContainer[] = [];
  const documents: Array<Record<string, unknown>> = [];
  let alertCount = 0;

  cases.forEach(({ caseId, createdAt }) => {
    const caseAttachments = demoAttachments.filter((attachment) => attachment.caseId === caseId);
    const times = buildDemoAlertTimes({
      createdAt,
      count: caseAttachments.length,
      now,
      random: rng,
    });

    caseAttachments.forEach(({ id, alertIds }, position) => {
      const { attachedAt, startedAt } = times[position];
      const savedObjectType = savedObjectTypes.get(id);

      if (savedObjectType != null) {
        operations.push({
          update: { _index: ALERTING_CASES_SAVED_OBJECT_INDEX, _id: `${savedObjectType}:${id}` },
        });
        documents.push({ [savedObjectType]: { created_at: attachedAt } });
      }

      operations.push({ update: { _index: ATTACHMENTS_INDEX_NAME, _id: id } });
      documents.push({ '@timestamp': attachedAt, created_at: attachedAt });

      alertIds.forEach((alertId) => {
        operations.push({ update: { _index: demoAlerts.get(alertId), _id: alertId } });
        documents.push({ 'kibana.alert.start': startedAt, '@timestamp': startedAt });
        alertCount += 1;
      });
    });
  });

  if (!dryRun && operations.length > 0) {
    const response = await esClient.bulk({
      refresh: 'wait_for',
      operations: operations.flatMap((operation, position) => [
        operation,
        { doc: documents[position] },
      ]),
    });

    response.items.forEach(({ update }) => {
      if (update?.error != null) {
        logger.error(`Failed to update ${update._index}/${update._id}: ${update.error.reason}`);
      }
    });
  }

  return { attachments: demoAttachments.length, alerts: alertCount };
};

/**
 * Gives every matching demo case a random status time line and writes the matching time fields
 * to the case saved object and to its `.cases` analytics document. The demo alert attachments of
 * each case follow the new creation time.
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
  const backdatedCases: BackdatedCase[] = [];
  let alertCounts: AlertAttachmentCounts = { attachments: 0, alerts: 0 };
  let { id: pitId } = await esClient.openPointInTime({
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
      pitId = page.pit_id ?? pitId;
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
        backdatedCases.push({ caseId, createdAt: fields.created_at });

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

    alertCounts = await backdateDemoAlertAttachments({
      esClient,
      cases: backdatedCases,
      now,
      dryRun: argv.dryRun,
    });
  } finally {
    restoreRandom?.();
    await esClient.closePointInTime({ id: pitId });
  }

  logger.info(
    `${argv.dryRun ? 'Planned' : 'Backdated'} ${updatedCases} cases with the tag "${argv.tag}".`
  );
  logger.info(`Scenarios: ${JSON.stringify(scenarioCounts)}`);
  logger.info(
    `${argv.dryRun ? 'Planned' : 'Backdated'} ${
      alertCounts.attachments
    } demo alert attachments and ${alertCounts.alerts} demo alerts.`
  );

  if (missingAnalyticsDocs > 0) {
    logger.warning(
      `${missingAnalyticsDocs} cases have no .cases document. Run the analytics reset, then run this script again.`
    );
  }
};
