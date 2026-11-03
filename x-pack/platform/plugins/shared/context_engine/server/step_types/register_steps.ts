/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuditLogger,
  CoreTasksStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { SecurityTasksAuthz } from '@kbn/security-plugin/server/tasks';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import { apiPrivileges } from '../../common/features';
import type { AiIndexService } from '../ai_indices/service';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { KiVerifierWorkflowRunner } from '../ki_verification';
import type { ContextEngineAnalyticsService } from '../telemetry/analytics_service';
import { isContextEngineEnabledInSpace } from '../utils/is_context_engine_enabled_in_space';
import { registerStepDefinitions } from '.';
import { createVerifyKi } from './verify_ki';
import { createVerifyKiStepDefinition } from './verify_ki_step';

/** What the steps read from Core at run time. */
export type StepsCoreStart = Pick<CoreTasksStart, 'savedObjects' | 'uiSettings' | 'security'>;

/** What the steps read from the plugins started with Context Engine. */
export interface StepsStartDeps {
  security?: { authz: Pick<SecurityTasksAuthz, 'actions' | 'checkPrivilegesWithRequest'> };
}

export interface RegisterContextEngineStepsDeps {
  workflowsExtensions: Pick<WorkflowsExtensionsTasksSetup, 'registerStepDefinition'>;
  getStartServices: () => Promise<[StepsCoreStart, StepsStartDeps, unknown]>;
  analyticsService: ContextEngineAnalyticsService;
  getAiIndexService: () => AiIndexService;
  getImprovementsService: (
    esClient: ElasticsearchClient,
    spaceId: string
  ) => ImprovementsServiceApi;
  isFeedbackLoopEnabled: () => Promise<boolean>;
  /** Runs verifier workflows; resolves to undefined where workflows management is not available. */
  getWorkflowsManagement: () => Promise<KiVerifierWorkflowRunner | undefined>;
  logger: Logger;
  feedbackAnalysisLogger: Logger;
}

/**
 * Registers the Context Engine workflow steps (KI create, update, delete and verify, feedback
 * context and improvements). The one runtime behind both Kibana's `server` entry and the task pod's
 * `server/tasks` entry, which pass the same dependencies typed against what both provide.
 */
export const registerContextEngineSteps = ({
  workflowsExtensions,
  getStartServices,
  analyticsService,
  getAiIndexService,
  getImprovementsService,
  isFeedbackLoopEnabled,
  getWorkflowsManagement,
  logger,
  feedbackAnalysisLogger,
}: RegisterContextEngineStepsDeps): void => {
  const checkApiPrivileges = async (
    request: KibanaRequest,
    spaceId: string,
    actions: readonly string[]
  ): Promise<boolean> => {
    const [, startDeps] = await getStartServices();
    const { security } = startDeps;
    if (!security) {
      return true;
    }
    const { hasAllRequested } = await security.authz
      .checkPrivilegesWithRequest(request)
      .atSpace(spaceId, {
        kibana: actions.map((action) => security.authz.actions.api.get(action)),
      });
    return hasAllRequested;
  };

  const getAuditLogger = async (request: KibanaRequest): Promise<AuditLogger> => {
    const [coreStart] = await getStartServices();
    return coreStart.security.audit.asScoped(request);
  };

  const verifyKi = createVerifyKi({
    getAuditLogger,
    workflowVerifierDeps: {
      getWorkflowsManagement,
      checkExecutePrivilege: (request, spaceId) =>
        checkApiPrivileges(request, spaceId, WorkflowsManagementOperationPrivileges.execute),
    },
    analyticsService,
    logger,
  });
  workflowsExtensions.registerStepDefinition(
    createVerifyKiStepDefinition({ getStartServices }, verifyKi)
  );

  const isContextEngineEnabled = async (spaceId: string) => {
    const [coreStart] = await getStartServices();
    return isContextEngineEnabledInSpace({
      savedObjects: coreStart.savedObjects,
      uiSettings: coreStart.uiSettings,
      spaceId,
    });
  };

  const checkWritePrivilege = (request: KibanaRequest, spaceId: string) =>
    checkApiPrivileges(request, spaceId, [apiPrivileges.writeContextEngine]);

  registerStepDefinitions({
    workflowsExtensions,
    analyticsService,
    logger,
    getAiIndexService,
    isContextEngineEnabled,
    checkWritePrivilege,
    verifyKi,
    feedbackAnalysis: {
      getAiIndexService,
      getImprovementsService,
      getAuditLogger,
      isContextEngineEnabled,
      isFeedbackLoopEnabled,
      checkWritePrivilege,
      logger: feedbackAnalysisLogger,
    },
  });
};
