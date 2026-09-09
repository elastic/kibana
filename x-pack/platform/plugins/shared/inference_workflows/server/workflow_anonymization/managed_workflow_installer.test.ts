/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { INFERENCE_PII_ANONYMIZATION_DEFAULTS } from '@kbn/workflows/managed';
import type { ManagedWorkflowInstanceState } from '@kbn/workflows/server/types';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { createInferenceAnonymizationManagedWorkflowInstaller } from './managed_workflow_installer';

const createClient = (
  existingState: ManagedWorkflowInstanceState | null = null
): jest.Mocked<PluginScopedManagedWorkflowsApi> => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  getWorkflowStatus: jest.fn(),
  getInstalledWorkflowState: jest.fn().mockResolvedValue(existingState),
  listInstalledWorkflowStates: jest.fn().mockResolvedValue([]),
  execute: jest.fn(),
});

const EXPECTED_INSTALL_BASE = {
  values: INFERENCE_PII_ANONYMIZATION_DEFAULTS,
};

describe('inference anonymization managed workflow installer', () => {
  it('installs the complete startup set before signaling ready', async () => {
    const client = createClient();
    const installer = createInferenceAnonymizationManagedWorkflowInstaller({
      getClient: async () => client,
      logger: loggingSystemMock.createLogger(),
    });

    await installer.initialize(Promise.resolve(['default', 'space-a', 'space-a']));

    expect(client.install.mock.calls).toEqual([
      [
        'system-inference_pii_anonymization',
        { spaceId: 'default', workflowIdSuffix: 'default', ...EXPECTED_INSTALL_BASE },
      ],
      [
        'system-inference_pii_anonymization',
        { spaceId: 'space-a', workflowIdSuffix: 'space-a', ...EXPECTED_INSTALL_BASE },
      ],
    ]);
    expect(client.ready).toHaveBeenCalledTimes(1);
    expect(client.install.mock.invocationCallOrder[1]).toBeLessThan(
      client.ready.mock.invocationCallOrder[0]
    );
  });

  it('installs a newly encountered space once after startup reconciliation', async () => {
    const client = createClient();
    const installer = createInferenceAnonymizationManagedWorkflowInstaller({
      getClient: async () => client,
      logger: loggingSystemMock.createLogger(),
    });
    await installer.initialize(Promise.resolve(['default']));

    await Promise.all([
      installer.ensureInstalled('new-space'),
      installer.ensureInstalled('new-space'),
    ]);

    expect(client.install).toHaveBeenCalledTimes(2);
    expect(client.install).toHaveBeenLastCalledWith('system-inference_pii_anonymization', {
      spaceId: 'new-space',
      workflowIdSuffix: 'new-space',
      ...EXPECTED_INSTALL_BASE,
    });
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('does not signal ready when a startup installation fails', async () => {
    const client = createClient();
    client.install.mockRejectedValueOnce(new Error('install failed'));
    const installer = createInferenceAnonymizationManagedWorkflowInstaller({
      getClient: async () => client,
      logger: loggingSystemMock.createLogger(),
    });

    await expect(installer.initialize(Promise.resolve(['default']))).rejects.toThrow(
      'install failed'
    );
    expect(client.ready).not.toHaveBeenCalled();
  });

  it('retries a failed new-space installation', async () => {
    const client = createClient();
    const installer = createInferenceAnonymizationManagedWorkflowInstaller({
      getClient: async () => client,
      logger: loggingSystemMock.createLogger(),
    });
    await installer.initialize(Promise.resolve(['default']));
    client.install.mockRejectedValueOnce(new Error('transient install failure'));

    await expect(installer.ensureInstalled('new-space')).rejects.toThrow(
      'transient install failure'
    );
    await expect(installer.ensureInstalled('new-space')).resolves.toBeUndefined();

    expect(client.install).toHaveBeenCalledTimes(3);
  });

  it('uses existing persisted template values rather than defaults on reinstall', async () => {
    const persistedValues = {
      builtInRules: [
        { entityClass: 'EMAIL' as const, enabled: true },
        { entityClass: 'IP' as const, enabled: false },
        { entityClass: 'HOST_NAME' as const, enabled: true },
        { entityClass: 'USER_NAME' as const, enabled: true },
      ],
      customRules: [
        {
          id: 'rule-1',
          name: 'Project codes',
          entityClass: 'RESOURCE_NAME' as const,
          pattern: String.raw`\bPROJ-[0-9]{4}\b`,
          enabled: true,
        },
      ],
    };
    const existingState: ManagedWorkflowInstanceState = {
      workflowId: 'system-inference_pii_anonymization-default',
      spaceId: 'default',
      definitionId: 'system-inference_pii_anonymization',
      templateValues: persistedValues,
      documentVersion: 1,
    };
    const client = createClient(existingState);
    const installer = createInferenceAnonymizationManagedWorkflowInstaller({
      getClient: async () => client,
      logger: loggingSystemMock.createLogger(),
    });

    await installer.initialize(Promise.resolve(['default']));

    // Persisted values should be used rather than overwriting with defaults.
    expect(client.install).toHaveBeenCalledWith('system-inference_pii_anonymization', {
      spaceId: 'default',
      workflowIdSuffix: 'default',
      values: persistedValues,
    });
  });
});
