/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClientContext } from '../actions_client';

export function isSystemAction(context: ActionsClientContext, connectorId: string): boolean {
  return !!context.inMemoryConnectors.find(
    (connector) => connector.isSystemAction && connector.id === connectorId
  );
}
