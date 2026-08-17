/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { INFERENCE_PII_ANONYMIZATION_WORKFLOW } from '@kbn/workflows/managed';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { createLegacyCustomizationMigration } from './legacy_customization_migration';

type Management = Pick<WorkflowsManagementApi, 'createWorkflow' | 'getWorkflow'>;

const REGEX_SETTINGS = JSON.stringify({
  rules: [{ type: 'RegExp', enabled: true, pattern: 'custom@example\\.com', entityClass: 'EMAIL' }],
});

const NER_SETTINGS = JSON.stringify({
  rules: [{ type: 'NER', enabled: true, allowedEntityClasses: ['PER'] }],
});

const managedWorkflow: WorkflowDetailDto = {
  id: 'system-inference_pii_anonymization-default',
  name: 'Protect sensitive inference data',
  enabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'system',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'system',
  yaml: INFERENCE_PII_ANONYMIZATION_WORKFLOW.yaml,
  valid: true,
  definition: null,
  managed: true,
  managedBy: 'inferenceWorkflows',
  originManagedWorkflowId: INFERENCE_PII_ANONYMIZATION_WORKFLOW.id,
};

describe('legacy customization migration', () => {
  it('creates one disabled provenance-preserving clone and a completed marker', async () => {
    const repository = savedObjectsRepositoryMock.create();
    const scopedRepository = savedObjectsRepositoryMock.create();
    repository.asScopedToNamespace.mockReturnValue(scopedRepository);
    scopedRepository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('migration', 'global-profile')
    );
    const management: jest.Mocked<Management> = {
      getWorkflow: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(managedWorkflow),
      createWorkflow: jest.fn().mockResolvedValue(managedWorkflow),
    };
    const migration = createLegacyCustomizationMigration({
      getLegacySettings: jest.fn().mockResolvedValue(REGEX_SETTINGS),
      management,
      repository,
      logger: loggingSystemMock.createLogger(),
    });

    await migration.run('default', httpServerMock.createKibanaRequest());
    await migration.run('default', httpServerMock.createKibanaRequest());

    expect(management.createWorkflow).toHaveBeenCalledTimes(1);
    expect(management.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^inference-pii-anonymization-migration-/),
        yaml: expect.stringContaining('enabled: false'),
      }),
      'default',
      expect.anything(),
      { originManagedWorkflowId: 'system-inference_pii_anonymization' }
    );
    expect(scopedRepository.create).toHaveBeenCalledWith(
      'inference_workflows_anonymization_migration',
      expect.objectContaining({ status: 'completed', cloneId: expect.any(String) }),
      { id: 'global-profile', overwrite: true }
    );

    const marker = scopedRepository.create.mock.calls[0][1];
    scopedRepository.get.mockResolvedValue({
      id: 'global-profile',
      type: 'inference_workflows_anonymization_migration',
      attributes: marker,
      references: [],
      namespaces: ['default'],
    });
    const restartedManagement: jest.Mocked<Management> = {
      getWorkflow: jest.fn(),
      createWorkflow: jest.fn(),
    };
    const restartedMigration = createLegacyCustomizationMigration({
      getLegacySettings: jest.fn().mockResolvedValue(REGEX_SETTINGS),
      management: restartedManagement,
      repository,
      logger: loggingSystemMock.createLogger(),
    });

    await restartedMigration.run('default', httpServerMock.createKibanaRequest());

    expect(restartedManagement.createWorkflow).not.toHaveBeenCalled();
  });

  it('records enabled NER rules for review without creating a clone', async () => {
    const repository = savedObjectsRepositoryMock.create();
    const scopedRepository = savedObjectsRepositoryMock.create();
    repository.asScopedToNamespace.mockReturnValue(scopedRepository);
    scopedRepository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('migration', 'global-profile')
    );
    const management: jest.Mocked<Management> = {
      getWorkflow: jest.fn(),
      createWorkflow: jest.fn(),
    };
    const logger = loggingSystemMock.createLogger();
    const migration = createLegacyCustomizationMigration({
      getLegacySettings: jest.fn().mockResolvedValue(NER_SETTINGS),
      management,
      repository,
      logger,
    });

    await migration.run('default', httpServerMock.createKibanaRequest());

    expect(management.createWorkflow).not.toHaveBeenCalled();
    expect(scopedRepository.create).toHaveBeenCalledWith(
      'inference_workflows_anonymization_migration',
      expect.objectContaining({ status: 'needs_ner_review', cloneId: undefined }),
      { id: 'global-profile', overwrite: true }
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('NER rules'));
  });
});
