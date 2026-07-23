/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { InferenceWorkflowsSetupDeps, InferenceWorkflowsStartDeps } from './types';
import { aiPromptStepDefinition } from './steps/ai/ai_prompt_step/step';
import { aiSummarizeStepDefinition } from './steps/ai/ai_summarize_step/step';
import { aiClassifyStepDefinition } from './steps/ai/ai_classify_step/step';
import { registerInferenceFeatures } from './steps/ai/register_inference_features';
import { aroundCompletionTriggerDefinition } from '../common/workflow_anonymization';
import { aiPiiStepDefinition } from './workflow_anonymization/ai_pii_step';
import { callSiteProceedStepDefinition } from './workflow_anonymization/call_site_proceed_step';
import { piiRestoreStepDefinition } from './workflow_anonymization/pii_restore_step';
import { createWorkflowAnonymizationProvider } from './workflow_anonymization/create_workflow_anonymization_provider';
import { anonymizationMigrationSavedObjectType } from './saved_objects';
import {
  createLegacyCustomizationMigration,
  type LegacyCustomizationMigration,
} from './workflow_anonymization/legacy_customization_migration';
import {
  createInferenceAnonymizationManagedWorkflowInstaller,
  type InferenceAnonymizationManagedWorkflowInstaller,
} from './workflow_anonymization/managed_workflow_installer';

const MANAGED_WORKFLOW_OWNER = 'inferenceWorkflows';

export class InferenceWorkflowsPlugin
  implements Plugin<{}, {}, InferenceWorkflowsSetupDeps, InferenceWorkflowsStartDeps>
{
  private readonly logger: Logger;

  private managedWorkflowInstaller?: InferenceAnonymizationManagedWorkflowInstaller;

  private legacyCustomizationMigration?: LegacyCustomizationMigration;

  private workflowsManagement?: WorkflowsManagementApi;

  private workflowDrivenEnabled: boolean = false;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(core: CoreSetup<InferenceWorkflowsStartDeps>, deps: InferenceWorkflowsSetupDeps) {
    this.workflowDrivenEnabled = deps.inference.anonymizationConfig.workflowDrivenEnabled;
    this.workflowsManagement = deps.workflowsManagement.management;
    core.savedObjects.registerType(anonymizationMigrationSavedObjectType);
    deps.workflowsExtensions.registerStepDefinition(aiPromptStepDefinition(core));
    deps.workflowsExtensions.registerStepDefinition(aiSummarizeStepDefinition(core));
    deps.workflowsExtensions.registerStepDefinition(aiClassifyStepDefinition(core));
    deps.workflowsExtensions.registerStepDefinition(aiPiiStepDefinition);
    deps.workflowsExtensions.registerStepDefinition(callSiteProceedStepDefinition);
    deps.workflowsExtensions.registerStepDefinition(piiRestoreStepDefinition);
    deps.workflowsExtensions.registerTriggerDefinition(aroundCompletionTriggerDefinition);
    deps.workflowsExtensions.registerManagedWorkflowOwner(MANAGED_WORKFLOW_OWNER);
    deps.inference.registerWorkflowAnonymizationProvider(
      createWorkflowAnonymizationProvider({
        management: deps.workflowsManagement.management,
        triggerCacheTtlMs: deps.inference.anonymizationConfig.triggerCacheTtlMs,
        ensureManagedWorkflow: async (spaceId, request) => {
          if (!this.managedWorkflowInstaller) {
            throw new Error('Inference anonymization managed workflow installer is unavailable');
          }
          await this.managedWorkflowInstaller.ensureInstalled(spaceId);
          // Run legacy migration async — do not block the inference call. Errors are logged
          // and retried on the next request (activeMigration is reset on failure).
          this.legacyCustomizationMigration?.run(spaceId, request).catch((error: unknown) => {
            this.logger.error(
              `Legacy anonymization customization migration failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          });
        },
      })
    );

    if (deps.searchInferenceEndpoints) {
      registerInferenceFeatures(deps.searchInferenceEndpoints);
    }

    return {};
  }

  start(core: CoreStart, deps: InferenceWorkflowsStartDeps) {
    const repository = core.savedObjects.createInternalRepository([
      'space',
      anonymizationMigrationSavedObjectType.name,
    ]);
    const existingSpaceIds = repository
      .find({ type: 'space', perPage: 10_000 })
      .then(({ saved_objects: spaces }) => [DEFAULT_SPACE_ID, ...spaces.map(({ id }) => id)]);

    this.managedWorkflowInstaller = createInferenceAnonymizationManagedWorkflowInstaller({
      getClient: () => deps.workflowsExtensions.initManagedWorkflowsClient(MANAGED_WORKFLOW_OWNER),
      logger: this.logger.get('managed_workflow'),
    });
    const policyService = deps.anonymization?.getPolicyService();
    if (policyService) {
      if (!this.workflowsManagement) {
        throw new Error('Workflows management API is unavailable');
      }
      this.legacyCustomizationMigration = createLegacyCustomizationMigration({
        policyService,
        management: this.workflowsManagement,
        repository,
        logger: this.logger.get('legacy_customization_migration'),
      });
    }
    if (this.workflowDrivenEnabled) {
      void this.managedWorkflowInstaller.initialize(existingSpaceIds).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to install inference anonymization managed workflow: ${message}`);
      });
    }

    return {};
  }
}
