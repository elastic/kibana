/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const storedSloSettingsSchema = t.intersection([
  t.type({
    useAllRemoteClusters: t.boolean,
    selectedRemoteClusters: t.array(t.string),
  }),
  // was added later, so it can be missing in some stored settings
  t.partial({
    staleThresholdInHours: t.number,
    staleInstancesCleanupEnabled: t.boolean,
  }),
]);

const sloSettingsSchema = t.type({
  useAllRemoteClusters: t.boolean,
  selectedRemoteClusters: t.array(t.string),
  staleThresholdInHours: t.number,
  staleInstancesCleanupEnabled: t.boolean,
});

const serverlessSloSettingsSchema = t.type({
  staleThresholdInHours: t.number,
  staleInstancesCleanupEnabled: t.boolean,
});

export { serverlessSloSettingsSchema, sloSettingsSchema, storedSloSettingsSchema };
