/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepActorSnapshot } from './steps_state_machine';

export const isProcessorUnderEdit = (stepSnapshot: StepActorSnapshot) => {
  return stepSnapshot.matches('draft') || stepSnapshot.matches({ configured: 'editing' });
};
