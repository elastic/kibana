/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INGEST_HUB_ONBOARDING_ENABLED_FLAG } from './constants';

export const ONBOARDING_FEATURE_FLAG_DEFINITIONS = [
  {
    key: INGEST_HUB_ONBOARDING_ENABLED_FLAG,
    name: 'Onboarding',
    description: 'Enables onboarding API routes in the Ingest Hub plugin',
    tags: ['ingest-hub', 'onboarding'],
    variationType: 'boolean' as const,
    variations: [
      { name: 'Enabled', description: 'Onboarding routes are active', value: true },
      { name: 'Disabled', description: 'Onboarding routes return 404', value: false },
    ],
  },
];
