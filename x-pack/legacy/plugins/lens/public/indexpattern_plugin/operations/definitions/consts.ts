/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// esaggs returns __missing__ for null buckets in some contexts (e.g. split)
// so, we just force null buckets to have this value, and we special-case it.
export const MISSING_BUCKET_LABEL = '__missing__';
