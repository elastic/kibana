/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { boundedString } from '../packs/shared_schemas';

// `kuery` is free-form KQL from the picker's search box, bounded here so an oversized
// expression cannot reach Elasticsearch. Real values are tens of characters.
export const getAgentsRequestQuerySchema = t.partial({
  kuery: boundedString(2048),
  page: t.union([t.number, t.string]),
  perPage: t.union([t.number, t.string]),
  sortField: boundedString(256),
  sortOrder: t.union([t.literal('asc'), t.literal('desc')]),
  showUpgradeable: t.union([t.boolean, t.string]),
  showInactive: t.union([t.boolean, t.string]),
  showAgentless: t.union([t.boolean, t.string]),
  getStatusSummary: t.union([t.boolean, t.string]),
  pitId: boundedString(2048),
  searchAfter: t.unknown,
});

export type GetAgentsRequestQuerySchema = t.OutputOf<typeof getAgentsRequestQuerySchema>;
