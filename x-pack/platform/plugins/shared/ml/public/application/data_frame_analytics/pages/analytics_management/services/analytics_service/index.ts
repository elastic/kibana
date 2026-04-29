/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { useGetAnalytics } from './get_analytics';
export {
  useDeleteAnalytics,
  useDeleteAnalyticsAndDestIndex,
  useCanDeleteIndex,
} from './delete_analytics';
export { useStartAnalytics } from './start_analytics';
export { useStopAnalytics } from './stop_analytics';
