/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservableFlyoutApi } from './use_observable_flyout_api';

export const createObservableFlyoutApiMock = (): jest.Mocked<ObservableFlyoutApi> => ({
  openObservableFlyout: jest.fn(),
  openObservableCases: jest.fn(),
});
