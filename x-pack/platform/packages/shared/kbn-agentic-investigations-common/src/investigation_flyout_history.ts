/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * History key for the investigation details flyout and the entity flyouts opened from it.
 *
 * `Symbol.for` so the session parent and a child opened from another plugin share one key
 * across separately bundled plugins. A `Symbol()` created in each bundle would not match, and
 * Back would not return to the investigation.
 *
 * Kept off Security's document flyout key so this stack does not mix with alert and entity
 * flyouts opened from the Security app.
 */
export const investigationFlyoutHistoryKey: symbol = Symbol.for(
  'kibana.agenticInvestigations.investigationFlyout'
);
