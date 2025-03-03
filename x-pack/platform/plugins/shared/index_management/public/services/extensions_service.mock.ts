/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { ExtensionsSetup } from '@kbn/index-management-shared-types/src/services/extensions_service';
import { ExtensionsService } from './extensions_service';

export type ExtensionsSetupMock = jest.Mocked<ExtensionsSetup>;

const createServiceMock = (): ExtensionsSetupMock => ({
  addAction: jest.fn(),
  addBadge: jest.fn(),
  addBanner: jest.fn(),
  addFilter: jest.fn(),
  addToggle: jest.fn(),
  addColumn: jest.fn(),
  setEmptyListContent: jest.fn(),
  addIndexDetailsTab: jest.fn(),
  setIndexOverviewContent: jest.fn(),
  setIndexMappingsContent: jest.fn(),
  setIndexDetailsPageRoute: jest.fn(),
});

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<ExtensionsService>> = {
    setup: jest.fn(),
  };
  mocked.setup.mockReturnValue(createServiceMock());
  return mocked;
};

export const extensionsServiceMock = {
  create: createMock,
  createSetupContract: createServiceMock,
};
