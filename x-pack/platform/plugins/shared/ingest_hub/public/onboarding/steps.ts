/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OnboardingStepConfig {
  id: string;
  title: string;
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: 'connect', title: 'Connect' },
  { id: 'services', title: 'Services' },
  { id: 'name-and-scope', title: 'Name & Scope' },
  { id: 'deployment', title: 'Deployment' },
  { id: 'see-data', title: 'See Data' },
];
