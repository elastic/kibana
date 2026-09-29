/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { securityMock } from '@kbn/security-plugin/server/mocks';

import { appContextService } from '../../../app_context';

import { saveSettings } from '../../../settings';

import { buildDefaultSettings, saveILMMigrationChanges } from './default_settings';

vi.mock('../../../app_context');
vi.mock('../../../settings', () => {
  const mocked = {
    getSettingsOrUndefined: vi.fn().mockResolvedValue({
      ilm_migration_status: {
        metrics: 'success',
      },
    }),
    saveSettings: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockedAppContextService = appContextService as Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));
mockedAppContextService.getLogger.mockReturnValue({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any);

const saveSettingsMock = saveSettings as Mock;

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

describe('ILM migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save settings if migration status changed', async () => {
    const updatedILMMigrationStatusMap = new Map();
    updatedILMMigrationStatusMap.set('logs', 'success');

    await saveILMMigrationChanges(updatedILMMigrationStatusMap);

    expect(saveSettingsMock).toHaveBeenCalledWith(undefined, {
      ilm_migration_status: {
        logs: 'success',
        metrics: 'success',
      },
    });
  });

  it('should not save settings if migration status did not change', async () => {
    const updatedILMMigrationStatusMap = new Map();
    updatedILMMigrationStatusMap.set('metrics', 'success');

    await saveILMMigrationChanges(updatedILMMigrationStatusMap);

    expect(saveSettingsMock).not.toHaveBeenCalled();
  });
});
