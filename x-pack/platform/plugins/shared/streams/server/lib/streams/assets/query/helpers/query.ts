/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { v5 } from 'uuid';
import type { QueryLink } from '../../../../../../common/queries';
import { ASSET_UUID } from '../../fields';

export function getRuleIdFromQueryLink(query: QueryLink) {
  const queryHash = objectHash([query[ASSET_UUID], query.query.kql.query]);
  return v5(queryHash, v5.DNS);
}
