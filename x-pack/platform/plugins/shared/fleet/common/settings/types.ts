/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { z } from '@kbn/zod';

export type SettingsSection = 'AGENT_POLICY_ADVANCED_SETTINGS';

/**
 * Those dependencies are used to not require dependencies not used server side
 */
export interface SettingsUIDependencies {
  renderer: {
    renderCode: (code: string) => React.ReactNode;
  };
}

export interface SettingsConfig {
  name: string;
  title: string;
  description: (deps: SettingsUIDependencies) => string | React.ReactNode;
  learnMoreLink?: string;
  schema: z.ZodTypeAny;
  api_field: {
    name: string;
  };
  hidden?: boolean;
  options?: Array<{
    value: string;
    text: string;
  }>;
  example_value?: string | number | boolean;
  type?: 'yaml';
}
