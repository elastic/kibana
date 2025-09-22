/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { Capabilities } from '@kbn/core/server';
import { savedObjectsTypeRegistryMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { capabilitiesServiceMock } from '@kbn/core-capabilities-server-mocks';

const createContextMock = (capabilities: Partial<Capabilities> = {}) => {
  return {
    core: {
      savedObjects: {
        client: savedObjectsClientMock.create(),
        typeRegistry: savedObjectsTypeRegistryMock.create(),
      },
      uiSettings: {
        client: uiSettingsServiceMock.createClient(),
      },
      capabilities: of({
        ...capabilitiesServiceMock.createCapabilities(),
        ...capabilities,
      } as Capabilities),
    },
  };
};

const createFactoryMock = () => () => () => createContextMock();

export const contextMock = {
  create: createContextMock,
  createFactory: createFactoryMock,
};
