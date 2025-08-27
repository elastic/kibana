/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokCollection } from '@kbn/grok-ui';
import { fromPromise } from 'xstate5';

export function setupGrokCollectionActor() {
  return fromPromise<void, { grokCollection: GrokCollection }>(async ({ input }) => {
    await input.grokCollection.setup();
  });
}
