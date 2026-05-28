/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { createCallApmApiV2 } from './create_call_apm_api';

const coreMock = {
  featureFlags: { getBooleanValue: () => false },
} as unknown as CoreStart;

export function mockCreateCallApmApiV2(core: CoreStart = {} as CoreStart) {
  return createCallApmApiV2({ ...coreMock, ...core });
}
