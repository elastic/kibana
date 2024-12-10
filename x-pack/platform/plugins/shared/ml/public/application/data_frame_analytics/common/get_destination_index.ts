/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';

export const getDestinationIndex = (jobConfig: DataFrameAnalyticsConfig | undefined) =>
  jobConfig?.dest.index ?? '';
