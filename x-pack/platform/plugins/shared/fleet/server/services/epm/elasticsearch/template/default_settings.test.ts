/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/server/mocks';

import { appContextService } from '../../../app_context';

import { buildDefaultSettings } from './default_settings';

jest.mock('../../../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

describe('buildDefaultSettings', () => {
  it('should not generate default_field settings ', () => {
    const settings = buildDefaultSettings({
      type: 'logs',
    });

    expect(settings).toMatchInlineSnapshot(`
      Object {
        "index": Object {
          "lifecycle": Object {
            "name": "logs",
          },
        },
      }
    `);
  });
});
