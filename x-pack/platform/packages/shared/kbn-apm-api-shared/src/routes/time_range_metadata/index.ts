/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { timeRangeMetadataRoute } from './time_range_metadata';

export const timeRangeMetadataRouteDefinitions = {
  timeRangeMetadata: timeRangeMetadataRoute,
};

export type { TimeRangeMetadataResponse } from './time_range_metadata';
