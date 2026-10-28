/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionType as ConnectorType, ExecutorType } from './types';

export const defaultValidateDef = {
  config: { schema: lazySchema(() => z.object({})) },
  secrets: { schema: lazySchema(() => z.object({})) },
  params: { schema: lazySchema(() => z.object({})) },
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
