/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export const MIN_SIZE = 10;
export const MAX_SIZE = 10000;

/** currently the same shape as "fields" property in the ES response */
export type MaybeRawData = SearchResponse['fields'] | undefined;
