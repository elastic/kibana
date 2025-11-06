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
    const ilmPolicies = new Map();
    ilmPolicies.set('logs', {
      deprecatedILMPolicy: {
        version: 1,
      },
      newILMPolicy: { version: 1 },
    });

    const settings = buildDefaultSettings({
      type: 'logs',
      ilmMigrationStatusMap: new Map(),
      ilmPolicies,
    });

    expect(settings).toMatchInlineSnapshot(`
      Object {
        "index": Object {
          "lifecycle": Object {
            "name": "logs@lifecycle",
          },
        },
      }
    `);
  });

  it('should use new ILM policy when migration was successful', () => {
    const ilmPolicies = new Map();
    ilmPolicies.set('logs', {
      deprecatedILMPolicy: {
        version: 1,
        in_use_by: {
          composable_templates: [{}],
        },
      },
      newILMPolicy: { version: 2 },
    });
    const ilmMigrationStatusMap = new Map();
    ilmMigrationStatusMap.set('logs', 'success');

    const settings = buildDefaultSettings({
      type: 'logs',
      ilmMigrationStatusMap,
      ilmPolicies,
    });

    expect(settings).toMatchInlineSnapshot(`
      Object {
        "index": Object {
          "lifecycle": Object {
            "name": "logs@lifecycle",
          },
        },
      }
    `);
  });

  it('should use new ILM policy when deprecated policy does not exist', () => {
    const ilmPolicies = new Map();
    ilmPolicies.set('logs', {
      deprecatedILMPolicy: undefined,
      newILMPolicy: { version: 2 },
    });
    const ilmMigrationStatusMap = new Map();

    const settings = buildDefaultSettings({
      type: 'logs',
      ilmMigrationStatusMap,
      ilmPolicies,
    });

    expect(settings).toMatchInlineSnapshot(`
      Object {
        "index": Object {
          "lifecycle": Object {
            "name": "logs@lifecycle",
          },
        },
      }
    `);
  });

  it('should fall back to deprecated logs ILM policy when both modified and deprecated one is used', () => {
    const ilmPolicies = new Map();
    ilmPolicies.set('logs', {
      deprecatedILMPolicy: {
        version: 2,
        in_use_by: {
          composable_templates: [{}],
        },
      },
      newILMPolicy: { version: 2 },
    });

    const settings = buildDefaultSettings({
      type: 'logs',
      ilmMigrationStatusMap: new Map(),
      ilmPolicies,
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

  it('should use new ILM policy when deprecated policy is not used', () => {
    const ilmPolicies = new Map();
    ilmPolicies.set('logs', {
      deprecatedILMPolicy: {
        version: 2,
        in_use_by: {
          composable_templates: [],
        },
      },
      newILMPolicy: { version: 2 },
    });

    const settings = buildDefaultSettings({
      type: 'logs',
      ilmMigrationStatusMap: new Map(),
      ilmPolicies,
    });

    expect(settings).toMatchInlineSnapshot(`
      Object {
        "index": Object {
          "lifecycle": Object {
            "name": "logs@lifecycle",
          },
        },
      }
    `);
  });

  it('should use @lifecycle ILM policy for OTEL input type', () => {
    const settings = buildDefaultSettings({
      type: 'logs',
      isOtelInputType: true,
      ilmMigrationStatusMap: new Map(),
      ilmPolicies: new Map(),
    });

    expect(settings).toMatchInlineSnapshot(`
      Object {
        "index": Object {
          "lifecycle": Object {
            "name": "logs@lifecycle",
          },
        },
      }
    `);
  });
});
