/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { ActionTypeModel } from '@kbn/alerts-ui-shared';
import { connectorsSpecs, type ConnectorSpec } from '@kbn/connector-specs';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';

export function registerConnectorTypesFromSpecs({
  connectorTypeRegistry,
}: {
  connectorTypeRegistry: TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'];
}) {
  for (const spec of Object.values(connectorsSpecs)) {
    connectorTypeRegistry.register(createConnectorTypeFromSpec(spec));
  }
}

function createConnectorTypeFromSpec(spec: ConnectorSpec): ActionTypeModel {
  return {
    id: spec.metadata.id,
    actionTypeTitle: spec.metadata.displayName,
    selectMessage: spec.metadata.description,
    iconClass: spec.metadata.icon ?? 'globe',
    // TODO: Implement the rest of the properties
    actionConnectorFields: null,
    actionParamsFields: lazy(() => Promise.resolve({ default: () => null })),
    validateParams: async () => ({ errors: {} }),
  };
}
