/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIGNALS_ID } from '../../../../common/constants';
import { FindSignalParams } from './types';

export const findSignals = async ({ alertsClient, perPage, page, fields }: FindSignalParams) =>
  alertsClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: `alert.attributes.alertTypeId: ${SIGNALS_ID}`,
    },
  });
