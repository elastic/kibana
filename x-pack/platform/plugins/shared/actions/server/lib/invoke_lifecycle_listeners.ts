/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ConnectorLifecycleListener,
  ConnectorLifecyclePostSaveParams,
  ConnectorLifecyclePostDeleteParams,
} from '../types';

interface LifecycleHookParams {
  onPostSave: Omit<ConnectorLifecyclePostSaveParams, 'connectorType'>;
  onPostDelete: Omit<ConnectorLifecyclePostDeleteParams, 'connectorType'>;
}

export async function invokeLifecycleListeners<H extends 'onPostSave' | 'onPostDelete'>(
  listeners: ConnectorLifecycleListener[] | undefined,
  hookName: H,
  connectorType: string,
  params: LifecycleHookParams[H],
  logger: Logger
): Promise<void> {
  if (!listeners?.length) return;
  for (const listener of listeners) {
    if (listener.connectorTypes === '*' || listener.connectorTypes.includes(connectorType)) {
      const hook = listener[hookName];
      if (hook) {
        try {
          await hook({ ...params, connectorType });
        } catch (err) {
          // Log but don't fail the connector operation for listener errors
          logger.error(
            `Connector lifecycle listener ${hookName} error for connectorType ${connectorType}: ${err.message}`
          );
        }
      }
    }
  }
}
