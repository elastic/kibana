/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/plugins/shared/alerting/server/saved_objects/schemas/raw_rule/v13.ts
// No data-shape change in model version 13 (mapping-only fix for actions.params ignore_above).
export { rawRuleSchema } from './v12';
========
export const addWatchlistAttributeToStore = jest.fn().mockResolvedValue(undefined);
export const removeWatchlistAttributeFromStore = jest.fn().mockResolvedValue(undefined);
>>>>>>>> 9.4:x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/watchlists/entity_sources/sync/__mocks__/entity_store_sync.ts
