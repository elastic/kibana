/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/plugins/shared/streams/server/lib/sig_events/alerts_data_stream.ts
/** Alerts-as-data alias the streams plugin reads from (owned by the alerting system). */
export const ALERTS_DATA_STREAM = '.alerts-streams.alerts-default';
========
export const bulkUpsertOperationsFactory = jest
  .fn()
  .mockReturnValue(() => [{ index: {} }, { doc: {} }]);
export const applyBulkUpsert = jest.fn().mockResolvedValue(undefined);
>>>>>>>> 9.4:x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/watchlists/entity_sources/bulk/__mocks__/upsert.ts
