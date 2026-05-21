/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';

/**
 * A feature is considered excluded when its latest revision carries the
 * root-level `excluded: true` marker. The server merges active and excluded
 * features into a single response when called with `include_excluded=true`;
 * the UI then partitions them client-side using this helper.
 */
export const isFeatureExcluded = (feature: Feature): boolean => Boolean(feature.excluded);
