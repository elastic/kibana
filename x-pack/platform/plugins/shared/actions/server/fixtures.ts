/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ActionType as ConnectorType, ExecutorType } from './types';

export const defaultValidateDef = {
  config: { schema: z.object({}) },
  secrets: { schema: z.object({}) },
  params: { schema: z.object({}) },
};

const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

export const getConnectorType = (overrides = {}): ConnectorType => ({
  id: 'my-connector-type',
  name: 'My connector type',
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: ['alerting'],
  validate: defaultValidateDef,
  executor,
  ...overrides,
});
