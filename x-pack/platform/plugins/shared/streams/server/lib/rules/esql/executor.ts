/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertsClientError,
  RuleExecutorOptions,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import { Alert } from '@kbn/alerts-as-data-utils';
import { EsqlAllowedActionGroups, EsqlRuleParams } from './types';

export const getRuleExecutor = () =>
  async function executor(
    options: RuleExecutorOptions<
      EsqlRuleParams,
      RuleTypeState,
      AlertInstanceState,
      AlertInstanceContext,
      EsqlAllowedActionGroups,
      Alert
    >
  ) {
    const { services, params, logger, startedAt, spaceId, getTimeRange } = options;
    const { savedObjectsClient, scopedClusterClient, alertsClient } = services;

    if (!alertsClient) {
      throw new AlertsClientError();
    }

    return { state: {} };
  };
