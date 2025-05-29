/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import type { DenormalizedAction } from '../../../rules_client';
import type { AdHocRunSO } from '../../../data/ad_hoc_run/types';
import { calculateSchedule } from '../../../backfill_client/lib';
import { adHocRunStatus } from '../../../../common/constants';
import type { RuleDomain } from '../../rule/types';
import type { ScheduleBackfillParam } from '../methods/schedule/types';

export const transformBackfillParamToAdHocRun = (
  param: ScheduleBackfillParam,
  rule: RuleDomain,
  actions: DenormalizedAction[],
  spaceId: string
): AdHocRunSO => {
  const schedule = calculateSchedule(rule.schedule.interval, param.ranges);
  const shouldRunActions = param.runActions !== undefined ? param.runActions : true;
  const start = param.ranges[0].start;
  const end = param.ranges[param.ranges.length - 1].end;

  return {
    apiKeyId: Buffer.from(rule.apiKey!, 'base64').toString().split(':')[0],
    apiKeyToUse: rule.apiKey!,
    createdAt: new Date().toISOString(),
    duration: rule.schedule.interval,
    enabled: true,
    end,
    rule: {
      name: rule.name,
      tags: rule.tags,
      alertTypeId: rule.alertTypeId,
      params: rule.params,
      apiKeyOwner: rule.apiKeyOwner,
      apiKeyCreatedByUser: rule.apiKeyCreatedByUser,
      actions: shouldRunActions ? actions : [],
      consumer: rule.consumer,
      enabled: rule.enabled,
      schedule: rule.schedule,
      createdBy: rule.createdBy,
      updatedBy: rule.updatedBy,
      createdAt: isString(rule.createdAt) ? rule.createdAt : rule.createdAt.toISOString(),
      updatedAt: isString(rule.updatedAt) ? rule.updatedAt : rule.updatedAt.toISOString(),
      revision: rule.revision,
    },
    spaceId,
    start,
    status: adHocRunStatus.PENDING,
    schedule,
  };
};
