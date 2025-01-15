/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { Logger } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { FindGapsParams } from './types';
import { Gap } from './gap';
import { transformToGap } from './transforms/transform_to_gap';
import { buildGapsFilter } from './build_gaps_filter';
import { GapStatus } from '../../../common/constants/gap_status';

export const findGaps = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: FindGapsParams;
}): Promise<{
  total: number;
  data: Gap[];
  page: number;
  perPage: number;
}> => {
  const { ruleId, start, end, page, perPage, statuses, sortField, sortOrder } = params;

  try {
    const filter = buildGapsFilter({ start, end, statuses });

    const getField = (field?: string) => {
      if (field === '@timestamp' || !field) {
        return '@timestamp';
      }
      return `kibana.alert.rule.gap.${field}`;
    };

    const gapsResponse = await eventLogClient.findEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      [ruleId],
      {
        filter,
        sort: [
          {
            sort_field: getField(sortField),
            sort_order: sortOrder ?? 'desc',
          },
        ],
        page,
        per_page: perPage,
      }
    );

    return {
      total: gapsResponse.total,
      data: transformToGap(gapsResponse),
      page: gapsResponse.page,
      perPage: gapsResponse.per_page,
    };
  } catch (err) {
    logger.error(`Failed to find gaps for rule ${ruleId}: ${err.message}`);
    throw err;
  }
};

export const findAllGaps = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: {
    ruleId: string;
    start: Date;
    end: Date;
    statuses?: GapStatus[];
  };
}): Promise<Gap[]> => {
  const { ruleId, start, end, statuses } = params;
  const allGaps: Gap[] = [];
  let currentPage = 1;
  const perPage = 10000;

  while (true) {
    const { data } = await findGaps({
      eventLogClient,
      logger,
      params: {
        ruleId,
        start: start.toISOString(),
        end: end.toISOString(),
        page: currentPage,
        perPage,
        statuses,
      },
    });

    allGaps.push(...data);

    if (data.length === 0 || data.length < perPage) {
      break;
    }

    currentPage++;
  }

  return allGaps;
};
