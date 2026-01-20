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

/**
 * Internal type that extends QueryLink with stored KQL for rule ID generation.
 * Used during migration to maintain stable rule IDs.
 */
export interface QueryLinkWithStoredKql extends QueryLink {
  _storedKqlQuery?: string;
}

export function getRuleIdFromQueryLink(query: QueryLinkWithStoredKql) {
  const queryForHash = query._storedKqlQuery ?? query.query.esql.where;
  const queryHash = objectHash([query[ASSET_UUID], queryForHash]);
  return v5(queryHash, v5.DNS);
}
