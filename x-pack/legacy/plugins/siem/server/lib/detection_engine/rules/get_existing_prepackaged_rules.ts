/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import { AlertsClient } from '../../../../../../../plugins/alerting/server';
import { RuleAlertType, isAlertTypes } from './types';
import { findRules } from './find_rules';

export const FILTER_NON_PREPACKED_RULES = `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:false"`;
export const FILTER_PREPACKED_RULES = `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`;

export const getNonPackagedRulesCount = async ({
  alertsClient,
}: {
  alertsClient: AlertsClient;
}): Promise<number> => {
  return getRulesCount({ alertsClient, filter: FILTER_NON_PREPACKED_RULES });
};

export const getRulesCount = async ({
  alertsClient,
  filter,
}: {
  alertsClient: AlertsClient;
  filter: string;
}): Promise<number> => {
  const firstRule = await findRules({
    alertsClient,
    filter,
    perPage: 1,
    page: 1,
    sortField: 'createdAt',
    sortOrder: 'desc',
  });
  return firstRule.total;
};

export const getRules = async ({
  alertsClient,
  filter,
}: {
  alertsClient: AlertsClient;
  filter: string;
}): Promise<RuleAlertType[]> => {
  const count = await getRulesCount({ alertsClient, filter });
  const rules = await findRules({
    alertsClient,
    filter,
    perPage: count,
    page: 1,
    sortField: 'createdAt',
    sortOrder: 'desc',
  });

  if (isAlertTypes(rules.data)) {
    return rules.data;
  } else {
    // If this was ever true, you have a really messed up system.
    // This is keep typescript happy since we have an unknown with data
    return [];
  }
};

export const getNonPackagedRules = async ({
  alertsClient,
}: {
  alertsClient: AlertsClient;
}): Promise<RuleAlertType[]> => {
  return getRules({
    alertsClient,
    filter: FILTER_NON_PREPACKED_RULES,
  });
};

export const getExistingPrepackagedRules = async ({
  alertsClient,
}: {
  alertsClient: AlertsClient;
}): Promise<RuleAlertType[]> => {
  return getRules({
    alertsClient,
    filter: FILTER_PREPACKED_RULES,
  });
};
