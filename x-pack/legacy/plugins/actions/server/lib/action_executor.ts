/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { PluginStartContract as EncryptedSavedObjectsStartContract } from '../../../../../plugins/encrypted_saved_objects/server';
import { LegacySpacesPlugin as SpacesPluginStartContract } from '../../../spaces';
import { Logger } from '../../../../../../src/core/server';
import { validateParams, validateConfig, validateSecrets } from './validate_with_schema';
import {
  ActionTypeExecutorResult,
  ActionTypeRegistryContract,
  GetServicesFunction,
  RawAction,
} from '../types';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IEvent, IEventLogger } from '../../../../../plugins/event_log/server';

export interface ActionExecutorContext {
  logger: Logger;
  spaces: () => SpacesPluginStartContract | undefined;
  getServices: GetServicesFunction;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsStartContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  eventLogger: IEventLogger;
}

export interface ExecuteOptions {
  actionId: string;
  request: Hapi.Request;
  params: Record<string, any>;
}

export type ActionExecutorContract = PublicMethodsOf<ActionExecutor>;

export class ActionExecutor {
  private isInitialized = false;
  private actionExecutorContext?: ActionExecutorContext;

  public initialize(actionExecutorContext: ActionExecutorContext) {
    if (this.isInitialized) {
      throw new Error('ActionExecutor already initialized');
    }
    this.isInitialized = true;
    this.actionExecutorContext = actionExecutorContext;
  }

  public async execute({
    actionId,
    params,
    request,
  }: ExecuteOptions): Promise<ActionTypeExecutorResult> {
    if (!this.isInitialized) {
      throw new Error('ActionExecutor not initialized');
    }

    const {
      logger,
      spaces,
      getServices,
      encryptedSavedObjectsPlugin,
      actionTypeRegistry,
      eventLogger,
    } = this.actionExecutorContext!;

    const spacesPlugin = spaces();
    const services = getServices(request);
    const namespace = spacesPlugin && spacesPlugin.getSpaceId(request);

    // Ensure user can read the action before processing
    const {
      attributes: { actionTypeId, config, name },
    } = await services.savedObjectsClient.get<RawAction>('action', actionId);

    try {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    } catch (err) {
      return { status: 'error', actionId, message: err.message, retry: false };
    }

    // Only get encrypted attributes here, the remaining attributes can be fetched in
    // the savedObjectsClient call
    const {
      attributes: { secrets },
    } = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAction>(
      'action',
      actionId,
      {
        namespace: namespace === 'default' ? undefined : namespace,
      }
    );
    const actionType = actionTypeRegistry.get(actionTypeId);

    let validatedParams;
    let validatedConfig;
    let validatedSecrets;

    try {
      validatedParams = validateParams(actionType, params);
      validatedConfig = validateConfig(actionType, config);
      validatedSecrets = validateSecrets(actionType, secrets);
    } catch (err) {
      return { status: 'error', actionId, message: err.message, retry: false };
    }

    let result: ActionTypeExecutorResult | null = null;
    const actionLabel = `${actionId} - ${actionTypeId} - ${name}`;

    const loggedEvent: IEvent = {
      event: {
        action: EVENT_LOG_ACTIONS.execute,
      },
      kibana: {
        namespace,
        saved_objects: [
          {
            type: 'action',
            id: actionId,
          },
        ],
      },
    };

    eventLogger.startTiming(loggedEvent);
    let error: any;

    try {
      result = await actionType.executor({
        actionId,
        services,
        params: validatedParams,
        config: validatedConfig,
        secrets: validatedSecrets,
      });
      loggedEvent.message = `action executed successfully: ${actionLabel}`;
    } catch (err) {
      error = err;
      loggedEvent.message = `action executed unsuccessfully: ${actionLabel} - ${err.message}`;
      logger.warn(loggedEvent.message);
    }

    eventLogger.stopTiming(loggedEvent);
    eventLogger.logEvent(loggedEvent);

    if (error != null) {
      throw error;
    }

    logger.debug(`action executed successfully: ${actionLabel}`);

    // return basic response if none provided
    if (result == null) return { status: 'ok', actionId };

    return result;
  }
}
