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

export const DECLARATIVE_ABUSEIPDB_CONNECTOR_ID = '.declarative-abuseipdb';
export const DECLARATIVE_OKTA_CONNECTOR_ID = '.declarative-okta';

export const DECLARATIVE_CONNECTOR_METADATA: ConnectorMetadata[] = [
  {
    id: DECLARATIVE_ABUSEIPDB_CONNECTOR_ID,
    displayName: 'AbuseIPDB (Declarative PoC)',
    description: 'Development-only AbuseIPDB connector loaded from a remote YAML definition',
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },
  {
    id: DECLARATIVE_OKTA_CONNECTOR_ID,
    displayName: 'Okta (Declarative PoC)',
    description: 'Development-only Okta connector loaded from a remote YAML definition',
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },
];

export const registerDeclarativeConnectorTypes = ({
  actions,
  catalog,
}: {
  actions: ActionsPluginSetupContract;
  catalog: DeclarativeConnectorCatalogService;
}): void => {
  for (const metadata of DECLARATIVE_CONNECTOR_METADATA) {
    const provider: ConnectorSpecProvider = {
      metadata,
      getCurrentSpec: () => catalog.getCurrentSpec(metadata.id),
      getValidationSpecs: () => catalog.getValidationSpecs(metadata.id),
      getSpec: (version) => catalog.getSpec(metadata.id, version),
    };
    actions.registerType(createConnectorTypeFromSpecProvider(provider, actions));
  }
};
