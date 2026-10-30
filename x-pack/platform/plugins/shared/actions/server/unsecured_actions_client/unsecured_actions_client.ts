/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IClusterClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import type {
  BulkUnsecuredExecutionEnqueuer,
  ExecuteOptions,
  ExecutionResponse,
} from '../create_unsecured_execute_function';
import { asNotificationExecutionSource, NOTIFICATIONS_REQUESTER_ID } from '../lib';
import type { RelatedSavedObjects, ActionExecutorContract } from '../lib';
import type { ActionTypeExecutorResult, InMemoryConnector } from '../types';
import { asBackgroundTaskExecutionSource } from '../lib/action_execution_source';
import type { ConnectorWithAcl, ConnectorWithExtraFindData } from '../application/connector/types';
import {
  getAllUnsecured,
  getAllUnsecuredWithAcl,
} from '../application/connector/methods/get_all/get_all';
import type { GetAllUnsecuredParams } from '../application/connector/methods/get_all/types/params';
import type { ActionTypeRegistry } from '../action_type_registry';

// requests from background tasks (primarily for EDR)
const BACKGROUND_TASK_REQUESTER_ID = 'background_task';

// allowlist for features wanting access to the unsecured actions client
// which allows actions to be enqueued for execution without a user request
const ALLOWED_REQUESTER_IDS = [
  NOTIFICATIONS_REQUESTER_ID,
  BACKGROUND_TASK_REQUESTER_ID,
  // For functional testing
  'functional_tester',
];

export interface UnsecuredActionsClientOpts {
  actionExecutor: ActionExecutorContract;
  clusterClient: IClusterClient;
  executionEnqueuer: BulkUnsecuredExecutionEnqueuer<ExecutionResponse>;
  inMemoryConnectors: InMemoryConnector[];
  internalSavedObjectsRepository: ISavedObjectsRepository;
  kibanaIndices: string[];
  logger: Logger;
  connectorTypeRegistry: ActionTypeRegistry;
}

type UnsecuredExecuteOptions = Omit<ExecuteOptions, 'source'> & {
  spaceId: SpaceId;
  requesterId: string;
};

export interface IUnsecuredActionsClient {
  getAll: (spaceId: SpaceId) => Promise<ConnectorWithExtraFindData[]>;
  /**
   * Same as `getAll`, with the ACL of each stored connector. The caller must keep only the
   * connectors its request can view, for example with `filterVisible` of Core's access control.
   */
  getAllWithAcl: (spaceId: SpaceId) => Promise<ConnectorWithAcl[]>;
  execute: (opts: UnsecuredExecuteOptions) => Promise<ActionTypeExecutorResult<unknown>>;
  bulkEnqueueExecution: (
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ) => Promise<ExecutionResponse>;
}

export class UnsecuredActionsClient {
  constructor(private readonly opts: UnsecuredActionsClientOpts) {}

  public async execute({
    requesterId,
    id,
    params,
    relatedSavedObjects,
    spaceId,
  }: UnsecuredExecuteOptions) {
    // Check that requesterId is allowed
    if (!ALLOWED_REQUESTER_IDS.includes(requesterId)) {
      throw new Error(
        `"${requesterId}" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    }

    if (!relatedSavedObjects) {
      this.opts.logger.warn(
        `Calling "execute" in UnsecuredActionsClient without any relatedSavedObjects data. Consider including this for traceability.`
      );
    }

    const source = this.getSourceFromRequester(requesterId, id, relatedSavedObjects);

    return this.opts.actionExecutor.executeUnsecured({
      actionExecutionId: uuidv4(),
      actionId: id,
      params,
      relatedSavedObjects,
      spaceId,
      ...source,
    });
  }

  public async bulkEnqueueExecution(
    requesterId: string,
    actionsToExecute: ExecuteOptions[]
  ): Promise<ExecutionResponse> {
    // Check that requesterId is allowed
    if (!ALLOWED_REQUESTER_IDS.includes(requesterId)) {
      throw new Error(
        `"${requesterId}" feature is not allow-listed for UnsecuredActionsClient access.`
      );
    }

    // Inject source based on requesterId
    const actionsToEnqueue = actionsToExecute.map((action) => {
      const source = this.getSourceFromRequester(
        requesterId,
        action.id,
        action.relatedSavedObjects
      );
      return {
        ...action,
        ...source,
      };
    });
    return this.opts.executionEnqueuer(this.opts.internalSavedObjectsRepository, actionsToEnqueue);
  }

  public async getAll(spaceId: SpaceId): Promise<ConnectorWithExtraFindData[]> {
    return getAllUnsecured(this.getAllParams(spaceId));
  }

  public async getAllWithAcl(spaceId: SpaceId): Promise<ConnectorWithAcl[]> {
    return getAllUnsecuredWithAcl(this.getAllParams(spaceId));
  }

  private getAllParams(spaceId: SpaceId): GetAllUnsecuredParams {
    return {
      esClient: this.opts.clusterClient.asInternalUser,
      inMemoryConnectors: this.opts.inMemoryConnectors,
      kibanaIndices: this.opts.kibanaIndices,
      logger: this.opts.logger,
      internalSavedObjectsRepository: this.opts.internalSavedObjectsRepository,
      spaceId,
      connectorTypeRegistry: this.opts.connectorTypeRegistry,
    };
  }

  private getSourceFromRequester(
    requesterId: string,
    actionId: string,
    relatedSavedObjects?: RelatedSavedObjects
  ) {
    switch (requesterId) {
      case NOTIFICATIONS_REQUESTER_ID:
        return {
          source: asNotificationExecutionSource({
            requesterId,
            connectorId: actionId,
          }),
        };
      case BACKGROUND_TASK_REQUESTER_ID:
        const taskSO = (relatedSavedObjects ?? []).find((rso) => rso.type === 'task');
        if (taskSO) {
          return {
            source: asBackgroundTaskExecutionSource({
              taskId: taskSO.id,
              taskType: taskSO.typeId ?? 'unknown',
            }),
          };
        }
        return {};
      default:
        return {};
    }
  }
}
