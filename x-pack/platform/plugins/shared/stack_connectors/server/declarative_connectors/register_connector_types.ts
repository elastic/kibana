/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorMetadata } from '@kbn/connector-specs';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import {
  createConnectorTypeFromSpecProvider,
  type ConnectorSpecProvider,
} from '@kbn/actions-plugin/server/lib';
import type { DeclarativeConnectorCatalogService } from './catalog_service';

export const DECLARATIVE_CONNECTOR_ID = '.declarative';

const DECLARATIVE_RUNNER_METADATA: ConnectorMetadata = {
  id: DECLARATIVE_CONNECTOR_ID,
  displayName: 'Declarative connector',
  description: 'Executes connector specifications loaded from the declarative catalog',
  minimumLicense: 'enterprise',
  isTechnicalPreview: true,
  supportedFeatureIds: ['workflows', 'agentBuilder'],
};

export const registerDeclarativeConnectorType = ({
  actions,
  catalog,
}: {
  actions: ActionsPluginSetupContract;
  catalog: DeclarativeConnectorCatalogService;
}): void => {
  const provider: ConnectorSpecProvider = {
    metadata: DECLARATIVE_RUNNER_METADATA,
    getCurrentSpec: (id, version) => (id ? catalog.getCachedSpec(id, version) : undefined),
    getSpecs: (id) => (id ? catalog.getSpecs(id) : []),
    getSpec: (version, id) => (id ? catalog.getSpec(id, version) : Promise.resolve(undefined)),
    getSpecsForDiscovery: catalog.getCurrentSpecs,
  };
  actions.registerType(createConnectorTypeFromSpecProvider(provider, actions));
};
