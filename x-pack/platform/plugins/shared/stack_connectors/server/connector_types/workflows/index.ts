/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingConnectorFeatureId, SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { api } from './api';
import {
  ExecutorParamsSchema,
  ExternalWorkflowServiceConfigurationSchema,
  ExternalWorkflowServiceSecretConfigurationSchema,
  WorkflowsRuleActionParamsSchema,
} from './schema';
import { createExternalService } from './service';
import * as i18n from './translations';
import type {
  ExecutorParams,
  ExecutorSubActionRunParams,
  WorkflowsActionParamsType,
  WorkflowsExecutorResultData,
  WorkflowsPublicConfigurationType,
  WorkflowsSecretConfigurationType,
} from './types';
import { validateConnector, validateWorkflowsConfig } from './validators';

const supportedSubActions: string[] = ['run'];
export type ActionParamsType = WorkflowsActionParamsType;
export const ConnectorTypeId = '.workflows';

export interface WorkflowsRuleActionParams {
  subAction: 'run';
  subActionParams: {
    workflowId: string;
    inputs?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

// connector type definition
export function getConnectorType(): ConnectorType<
  WorkflowsPublicConfigurationType,
  WorkflowsSecretConfigurationType,
  ExecutorParams,
  WorkflowsExecutorResultData
> {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.NAME,
    validate: {
      config: {
        schema: ExternalWorkflowServiceConfigurationSchema,
        customValidator: validateWorkflowsConfig,
      },
      secrets: {
        schema: ExternalWorkflowServiceSecretConfigurationSchema,
      },
      params: {
        schema: ExecutorParamsSchema,
      },
      connector: validateConnector,
    },
    executor,
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
    isSystemActionType: true,
  };
}

// action executor
export async function executor(
  execOptions: ConnectorTypeExecutorOptions<
    WorkflowsPublicConfigurationType,
    WorkflowsSecretConfigurationType,
    WorkflowsActionParamsType
  >
): Promise<ConnectorTypeExecutorResult<WorkflowsExecutorResultData>> {
  const { actionId, configurationUtilities, params, logger, connectorUsageCollector } = execOptions;

  const { subAction, subActionParams } = params;

  let data: WorkflowsExecutorResultData | undefined;

  const externalService = createExternalService(
    actionId,
    {
      config: execOptions.config,
      secrets: execOptions.secrets,
    },
    logger,
    configurationUtilities,
    connectorUsageCollector
  );

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'run') {
    const runParams = subActionParams as ExecutorSubActionRunParams;
    data = await api.run({
      externalService,
      params: runParams,
      logger,
    });

    logger.debug(`response run workflow for workflow id: ${data.workflowRunId}`);
  }

  return { status: 'ok', data, actionId };
}

// Connector adapter for system action
export function getWorkflowsConnectorAdapter(): ConnectorAdapter<
  WorkflowsRuleActionParams,
  ExecutorParams
> {
  return {
    connectorTypeId: ConnectorTypeId,
    ruleActionParamsSchema: WorkflowsRuleActionParamsSchema,
    buildActionParams: ({ alerts, rule, params, ruleUrl, spaceId }) => {
      try {
        const subActionParams = params?.subActionParams;
        if (!subActionParams) {
          throw new Error(`Missing subActionParams. Received: ${JSON.stringify(params)}`);
        }

        const { workflowId, inputs } = subActionParams;
        if (!workflowId) {
          throw new Error(
            `Missing required workflowId parameter. Received params: ${JSON.stringify(params)}`
          );
        }

        // Merge alert context with user inputs
        const alertContext = {
          alerts: { new: alerts.new },
          rule: {
            id: rule.id,
            name: rule.name,
            tags: rule.tags,
            consumer: rule.consumer,
            producer: rule.producer,
            ruleTypeId: rule.ruleTypeId,
          },
          ruleUrl,
          spaceId,
        };

        const userInputs = inputs || {};
        const eventData = userInputs.event
          ? { ...alertContext, ...userInputs.event }
          : alertContext;

        return {
          subAction: 'run' as const,
          subActionParams: {
            workflowId,
            inputs: { ...userInputs, event: eventData },
          },
        };
      } catch (error) {
        return {
          subAction: 'run' as const,
          subActionParams: {
            workflowId: params?.subActionParams?.workflowId || 'unknown',
            inputs: params?.subActionParams?.inputs || {},
          },
        };
      }
    },
  };
}
