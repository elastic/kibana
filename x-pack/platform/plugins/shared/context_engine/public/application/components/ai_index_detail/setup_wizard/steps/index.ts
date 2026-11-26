/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetupWizardStep } from '../types';
import { connectStep } from './connect_step';
import { describeStep } from './describe_step';
import { dreamingStep } from './dreaming_step';
import { sourcesStep } from './sources_step';

/** The wizard's steps, in order. Finishing setup doesn't depend on which step is last. */
export const SETUP_WIZARD_STEPS: readonly SetupWizardStep[] = [
  dreamingStep,
  connectStep,
  sourcesStep,
  describeStep,
];
