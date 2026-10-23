/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEngineAppChromeAdapter } from '../../app_chrome_adapter';

export const createAppChromeMock = (): ContextEngineAppChromeAdapter => ({
  handleOnAppMount: jest.fn().mockResolvedValue(undefined),
  getClassicNavigation: jest.fn(),
  breadcrumbs: {
    setAppBreadcrumbs: jest.fn(),
    clearBreadcrumbs: jest.fn(),
  },
});
