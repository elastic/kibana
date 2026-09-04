/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorTypeHasInboundEvents } from '@kbn/connector-specs';
import type { ActionConnector } from '../../types';

export const getInboundIngestToken = (connector: ActionConnector): string | undefined => {
  if (!('secrets' in connector) || connector.secrets == null) {
    return undefined;
  }
  const secrets = connector.secrets as { ingestToken?: unknown };
  const token = secrets.ingestToken;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
};

export const isInboundIngressConnector = (connector: ActionConnector): boolean =>
  connectorTypeHasInboundEvents(connector.actionTypeId);
