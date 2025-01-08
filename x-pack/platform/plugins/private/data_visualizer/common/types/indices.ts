/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface IndicesOptions {
  allow_no_indices?: boolean;
  expand_wildcards?: estypes.ExpandWildcards;
  ignore_unavailable?: boolean;
}
