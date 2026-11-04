/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

/** The subset of Discover locator params this plugin uses to open a view. */
export interface DiscoverEsqlLocatorParams extends SerializableRecord {
  query: { esql: string };
}

export type DiscoverEsqlLocator = LocatorPublic<DiscoverEsqlLocatorParams>;
