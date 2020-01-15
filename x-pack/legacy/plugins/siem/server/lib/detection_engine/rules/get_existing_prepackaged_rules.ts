/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import { AlertsClient } from '../../../../../alerting';
import { RuleAlertType, isAlertTypes } from './types';
import { findRules } from './find_rules';

export const DEFAULT_PER_PAGE = 100;
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
  });
  return firstRule.total;
};

export const getRules = async ({
  alertsClient,
  perPage = DEFAULT_PER_PAGE,
  filter,
}: {
  alertsClient: AlertsClient;
  perPage?: number;
  filter: string;
}): Promise<RuleAlertType[]> => {
  const firstPrepackedRules = await findRules({
    alertsClient,
    filter,
    perPage,
    page: 1,
  });
  const totalPages = Math.ceil(firstPrepackedRules.total / firstPrepackedRules.perPage);
  if (totalPages <= 1) {
    if (isAlertTypes(firstPrepackedRules.data)) {
      return firstPrepackedRules.data;
    } else {
      // If this was ever true, you have a really messed up system.
      // This is keep typescript happy since we have an unknown with data
      return [];
    }
  } else {
    const returnPrepackagedRules = await Array(totalPages - 1)
      .fill({})
      .map((_, page) => {
        // page index starts at 2 as we already got the first page and we have more pages to go
        return findRules({
          alertsClient,
          filter,
          perPage,
          page: page + 2,
        });
      })
      .reduce<Promise<object[]>>(async (accum, nextPage) => {
        return [...(await accum), ...(await nextPage).data];
      }, Promise.resolve(firstPrepackedRules.data));

    if (isAlertTypes(returnPrepackagedRules)) {
      return returnPrepackagedRules;
    } else {
      // If this was ever true, you have a really messed up system.
      // This is keep typescript happy since we have an unknown with data
      return [];
    }
  }
};

export const getNonPackagedRules = async ({
  alertsClient,
  perPage = DEFAULT_PER_PAGE,
}: {
  alertsClient: AlertsClient;
  perPage?: number;
}): Promise<RuleAlertType[]> => {
  return getRules({
    alertsClient,
    perPage,
    filter: FILTER_NON_PREPACKED_RULES,
  });
};

export const getExistingPrepackagedRules = async ({
  alertsClient,
  perPage = DEFAULT_PER_PAGE,
}: {
  alertsClient: AlertsClient;
  perPage?: number;
}): Promise<RuleAlertType[]> => {
  return getRules({
    alertsClient,
    perPage,
    filter: FILTER_PREPACKED_RULES,
  });
};
