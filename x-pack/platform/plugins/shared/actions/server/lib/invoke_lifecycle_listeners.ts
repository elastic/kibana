/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ConnectorLifecycleListener,
  ConnectorLifecyclePostCreateParams,
  ConnectorLifecyclePostDeleteParams,
} from '../types';

export async function invokePostCreateListeners(
  listeners: ConnectorLifecycleListener[] | undefined,
  connectorType: string,
  params: Omit<ConnectorLifecyclePostCreateParams, 'connectorType'>,
  logger: Logger
): Promise<void> {
  if (!listeners?.length) return;
  for (const listener of listeners) {
    if (listener.connectorTypes === '*' || listener.connectorTypes.includes(connectorType)) {
      if (listener.onPostCreate) {
        try {
          await listener.onPostCreate({ ...params, connectorType });
        } catch (err) {
          logger.error(
            `Connector lifecycle listener onPostCreate error for connectorType ${connectorType}: ${err.message}`
          );
        }
      }
    }
  }
}

export async function invokePostDeleteListeners(
  listeners: ConnectorLifecycleListener[] | undefined,
  connectorType: string,
  params: Omit<ConnectorLifecyclePostDeleteParams, 'connectorType'>,
  logger: Logger
): Promise<void> {
  if (!listeners?.length) return;
  for (const listener of listeners) {
    if (listener.connectorTypes === '*' || listener.connectorTypes.includes(connectorType)) {
      if (listener.onPostDelete) {
        try {
          await listener.onPostDelete({ ...params, connectorType });
        } catch (err) {
          logger.error(
            `Connector lifecycle listener onPostDelete error for connectorType ${connectorType}: ${err.message}`
          );
        }
      }
    }
  }
}
