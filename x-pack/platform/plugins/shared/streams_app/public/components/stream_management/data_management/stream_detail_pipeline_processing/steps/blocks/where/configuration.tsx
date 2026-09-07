/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forwardRef } from 'react';
import type { StepActorRef } from '../../../state_management/steps_state_machine';

interface WhereBlockConfigurationProps {
  stepRef: StepActorRef;
}

// Intentionally parked in the native ingest-pipeline UI for now. Condition
// blocks are kept as a copied-file placeholder until ingest pipelines can
// represent nested conditional branches natively.
export const WhereBlockConfiguration = forwardRef<HTMLDivElement, WhereBlockConfigurationProps>(
  (_props, _ref) => null
);

export const WhereBlockConditionEditor = () => null;
