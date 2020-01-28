/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FindResult } from '../../../../../../../plugins/alerting/server';
import { SIGNALS_ID } from '../../../../common/constants';
import { FindRuleParams } from './types';

export const getFilter = (filter: string | null | undefined) => {
  if (filter == null) {
    return `alert.attributes.alertTypeId: ${SIGNALS_ID}`;
  } else {
    return `alert.attributes.alertTypeId: ${SIGNALS_ID} AND ${filter}`;
  }
};

export const findRules = async ({
  alertsClient,
  perPage,
  page,
  fields,
  filter,
  sortField,
  sortOrder,
}: FindRuleParams): Promise<FindResult> => {
  return alertsClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: getFilter(filter),
      sortOrder,
      sortField,
    },
  });
};
