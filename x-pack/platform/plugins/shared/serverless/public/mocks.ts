/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { ServerlessPluginStart } from './types';

const startMock = (): jest.Mocked<ServerlessPluginStart> => ({
  initNavigation: jest.fn(),
  setBreadcrumbs: jest.fn(),
  getNavigationCards$: jest.fn().mockReturnValue(of(undefined)),
});

export const serverlessMock = {
  createStart: startMock,
};
