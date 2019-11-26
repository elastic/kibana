/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIGNALS_ID } from '../../../../common/constants';
import { RuleParams } from './types';

export const createRules = async ({
  alertsClient,
  actionsClient, // TODO: Use this actionsClient once we have actions such as email, etc...
  description,
  enabled,
  falsePositives,
  filter,
  from,
  query,
  language,
  savedId,
  meta,
  filters,
  ruleId,
  immutable,
  index,
  interval,
  maxSignals,
  riskScore,
  outputIndex,
  name,
  severity,
  tags,
  to,
  type,
  references,
}: RuleParams) => {
  return alertsClient.create({
    data: {
      name,
      tags: [],
      alertTypeId: SIGNALS_ID,
      params: {
        description,
        ruleId,
        index,
        falsePositives,
        from,
        filter,
        immutable,
        query,
        language,
        outputIndex,
        savedId,
        meta,
        filters,
        maxSignals,
        riskScore,
        severity,
        tags,
        to,
        type,
        references,
      },
      interval,
      enabled,
      actions: [], // TODO: Create and add actions here once we have email, etc...
      throttle: null,
    },
  });
};
