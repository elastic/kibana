/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { Transaction } from '@kbn/apm-types/es_schemas_ui';
import { defineRoute } from '../types';
import { filterOptionsRt } from './custom_link_types';

export type CustomLinkTransactionResponse = Transaction;

export const customLinkTransactionRoute = defineRoute<CustomLinkTransactionResponse>()({
  endpoint: 'GET /internal/apm/settings/custom_links/transaction',
  params: t.partial({
    query: filterOptionsRt,
  }),
});
