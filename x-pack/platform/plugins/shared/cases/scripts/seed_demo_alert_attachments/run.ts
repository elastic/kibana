/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import yargs from 'yargs';
import { buildAlertCaseAttachment } from '../../common';
import { CaseStatuses } from '../../common/types/domain';
import { createEsClient, createKbnClient } from '../cases_generator/clients';
import { logger } from '../cases_generator/logger';
import { installSeededRandom, rng } from '../cases_generator/seeded_random';
import type { KbnContext } from '../cases_generator/types';
import { AUTO_GENERATED_TAG, casesBasePath, formatRequestError } from '../cases_generator/utils';
import {
  DEMO_ALERTS_INDEX,
  DEMO_ALERT_RULE_NAME,
  DEMO_ALERT_RULE_UUID,
  buildDemoAlert,
} from './demo_alert';

const FIND_PAGE_SIZE = 100;
const MAX_ALERTS_PER_CASE = 3;

interface FoundCase {
  id: string;
  status: CaseStatuses;
  totalAlerts: number;
}

interface FindCasesResponse {
  cases: FoundCase[];
  total: number;
}

interface PlannedCase {
  caseId: string;
  alertIds: string[];
}

const parseArgs = () =>
  yargs.help().options({
    kibana: {
      alias: 'k',
      describe: 'Kibana URL',
      type: 'string',
      default: 'http://127.0.0.1:5601',
    },
    username: {
      alias: 'u',
      describe: 'Kibana user for the attach',
      type: 'string',
      default: 'elastic',
    },
    password: { alias: 'p', type: 'string', default: 'changeme' },
    node: {
      alias: 'n',
      describe: 'Elasticsearch node URL',
      type: 'string',
      default: 'http://127.0.0.1:9200',
    },
    esUsername: {
      describe: 'Elasticsearch user for the alert write. The alerts indices are restricted.',
      type: 'string',
      default: 'kibana_system',
    },
    esPassword: { type: 'string', default: 'changeme' },
    ssl: { type: 'boolean', default: false },
    space: {
      alias: 's',
      describe: 'The space of the demo cases',
      type: 'string',
      demandOption: true,
    },
    owner: {
      alias: 'o',
      describe: 'The owner of the demo cases',
      type: 'string',
      default: 'cases',
    },
    tag: {
      describe: 'Seed only the cases with this tag',
      type: 'string',
      default: AUTO_GENERATED_TAG,
    },
    share: { describe: 'The share of the cases that get alerts', type: 'number', default: 0.7 },
    seed: { describe: 'Optional seed for a repeatable result', type: 'string', default: '' },
    dryRun: { describe: 'Print the plan and write nothing', type: 'boolean', default: false },
  }).argv;

const findCases = async (
  ctx: KbnContext,
  { space, owner, tag }: { space: string; owner: string; tag: string }
): Promise<FoundCase[]> => {
  const found: FoundCase[] = [];
  let page = 1;
  let total = 0;

  do {
    const { data } = await ctx.kbnClient.request<FindCasesResponse>({
      method: 'GET',
      path: `${casesBasePath(space)}/api/cases/_find`,
      headers: ctx.headers,
      query: { tags: tag, owner, perPage: FIND_PAGE_SIZE, page },
    });

    found.push(...data.cases.map(({ id, status, totalAlerts }) => ({ id, status, totalAlerts })));
    total = data.total;
    page += 1;
  } while (found.length < total);

  return found;
};

const isSkipped = ({ status, totalAlerts }: FoundCase): boolean =>
  totalAlerts > 0 || status === CaseStatuses.closed;

const planCases = (cases: FoundCase[], share: number): PlannedCase[] =>
  cases.flatMap((foundCase) => {
    if (isSkipped(foundCase) || rng() >= share) {
      return [];
    }

    const count = 1 + Math.floor(rng() * MAX_ALERTS_PER_CASE);

    return [{ caseId: foundCase.id, alertIds: Array.from({ length: count }, () => uuidv4()) }];
  });

/**
 * Seeds demo stack alerts and attaches them to the demo cases of one space through the attach API.
 * It skips a case that already has an alert and a closed case, because the API refuses an alert
 * on a closed case. It backdates nothing.
 */
export const runSeed = async (): Promise<void> => {
  const argv = parseArgs();
  const restoreRandom = argv.seed !== '' ? installSeededRandom(argv.seed) : undefined;

  try {
    const ctx = createKbnClient({
      url: argv.kibana,
      username: argv.username,
      password: argv.password,
      ssl: argv.ssl,
    });
    const cases = await findCases(ctx, { space: argv.space, owner: argv.owner, tag: argv.tag });
    const planned = planCases(cases, argv.share);
    const alertCount = planned.reduce((count, { alertIds }) => count + alertIds.length, 0);
    const skipped = cases.filter(isSkipped).length;

    logger.info(
      `${argv.dryRun ? 'Planned' : 'Seeding'} ${alertCount} alerts for ${planned.length} of ${
        cases.length
      } cases with the tag "${argv.tag}" in the space "${
        argv.space
      }" (${skipped} cases are closed or already have alerts).`
    );

    if (argv.dryRun || planned.length === 0) {
      return;
    }

    const esClient = createEsClient({
      node: argv.node,
      ssl: argv.ssl,
      username: argv.esUsername,
      password: argv.esPassword,
    });
    const timestamp = new Date().toISOString();
    const bulkResponse = await esClient.bulk({
      refresh: 'wait_for',
      operations: planned.flatMap(({ alertIds }) =>
        alertIds.flatMap((uuid) => [
          { create: { _index: DEMO_ALERTS_INDEX, _id: uuid } },
          buildDemoAlert({ uuid, space: argv.space, timestamp }),
        ])
      ),
    });

    const indexById = new Map<string, string>();
    bulkResponse.items.forEach(({ create }) => {
      if (create?.error != null) {
        logger.error(`Failed to create the demo alert ${create._id}: ${create.error.reason}`);
        return;
      }

      if (create?._id != null) {
        indexById.set(create._id, create._index);
      }
    });

    let attached = 0;

    for (const { caseId, alertIds } of planned) {
      const body = alertIds.flatMap((alertId) => {
        const index = indexById.get(alertId);

        return index != null
          ? [
              {
                ...buildAlertCaseAttachment(argv.owner, {
                  alertId,
                  index,
                  rule: { id: DEMO_ALERT_RULE_UUID, name: DEMO_ALERT_RULE_NAME },
                }),
                owner: argv.owner,
              },
            ]
          : [];
      });

      if (body.length > 0) {
        try {
          await ctx.kbnClient.request({
            method: 'POST',
            path: `${casesBasePath(argv.space)}/internal/cases/${caseId}/attachments/_bulk_create`,
            headers: ctx.headers,
            body,
          });
          attached += body.length;
        } catch (error) {
          logger.error(
            `Failed to attach the demo alerts to case ${caseId}: ${formatRequestError(error)}`
          );
        }
      }
    }

    logger.info(
      `Created ${indexById.size} demo alerts in ${DEMO_ALERTS_INDEX} and attached ${attached} of them.`
    );
    logger.info('Run the backdate script now, so the alert times follow the case time line.');
  } finally {
    restoreRandom?.();
  }
};
