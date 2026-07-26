/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryConfigProvider } from '../services/telemetry_config_provider';

export const createMockTelemetryConfigProvider = (
  isOptedIn = true
): jest.Mocked<TelemetryConfigProvider> =>
  ({
    getIsOptedIn: jest.fn().mockReturnValue(isOptedIn),
    start: jest.fn(),
    stop: jest.fn(),
    getObservable: jest.fn(),
  } as any);
