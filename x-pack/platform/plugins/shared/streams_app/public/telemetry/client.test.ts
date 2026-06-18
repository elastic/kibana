/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';

describe('StreamsTelemetryClient', () => {
  beforeEach(() => {
    analyticsService = {
      reportEvent: jest.fn(),
      registerEventType: jest.fn(),
      registerShipper: jest.fn(),
      registerContextProvider: jest.fn(),
      removeContextProvider: jest.fn(),
      optIn: jest.fn(),
      telemetryCounter$: new Observable(),
    };
  });
});
