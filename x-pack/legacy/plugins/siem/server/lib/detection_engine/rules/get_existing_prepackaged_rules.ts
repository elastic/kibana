/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import { AlertsClient } from '../../../../../alerting';
import { RuleAlertType, isAlertTypes } from './types';
import { findRules } from './find_rules';

export const DEFAULT_PER_PAGE: number = 100;

export const getExistingPrepackagedRules = async ({
  alertsClient,
  perPage = DEFAULT_PER_PAGE,
}: {
  alertsClient: AlertsClient;
  perPage?: number;
}): Promise<RuleAlertType[]> => {
  const firstPrepackedRules = await findRules({
    alertsClient,
    filter: `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`,
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
          filter: `alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`,
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
