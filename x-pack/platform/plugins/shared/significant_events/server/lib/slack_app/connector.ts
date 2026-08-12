/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InMemoryConnector, PluginStartContract } from '@kbn/actions-plugin/server';
import { RELAY_AUTH_ID } from '@kbn/connector-specs';

/**
 * Connector type id of the Slack (v2) `@kbn/connector-specs` spec. The Elastic Slack app is not a
 * connector type of its own — it is the `relay` auth method on that spec, which routes the actions
 * the Relay can serve through it instead of the Slack Web API.
 */
export const ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID = '.slack2';

/**
 * Id of the single in-memory connector instance. A deployment installs the Elastic Slack app
 * once, so there is exactly one instance and its id is stable — rules and workflows reference
 * it directly, and it must survive restarts and reconnects unchanged.
 */
export const ELASTIC_APPS_SLACK_CONNECTOR_ID = 'elastic-apps-slack';

const ELASTIC_APPS_SLACK_CONNECTOR_NAME = 'Slack (Elastic app)';

const buildConnector = (tenantKey: string): InMemoryConnector => ({
  id: ELASTIC_APPS_SLACK_CONNECTOR_ID,
  actionTypeId: ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID,
  name: ELASTIC_APPS_SLACK_CONNECTOR_NAME,
  // The Relay holds the Slack credentials and authenticates this deployment at the transport
  // layer, so `tenantKey` — which workspace this connector speaks for — is all the `relay` auth
  // method needs. `config.authType` mirrors the secret in plaintext, the same way
  // `ensureConfigAuthType` does for saved connectors.
  config: { authType: RELAY_AUTH_ID },
  secrets: { authType: RELAY_AUTH_ID, tenantKey },
  isMissingSecrets: false,
  isPreconfigured: true,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
});

/**
 * Publish the connector for a connected Slack workspace.
 *
 * In-memory connectors live only for the lifetime of the process, so this runs both on the
 * connect transition and again at plugin start for a deployment that was already connected.
 * It always unregisters first: `registerDynamicConnector` is a no-op when the id is taken, so
 * a reconnect to a different workspace would otherwise keep serving the previous tenant key.
 */
export const registerElasticAppsSlackConnector = ({
  actions,
  logger,
  tenantKey,
}: {
  actions: Pick<PluginStartContract, 'registerDynamicConnector' | 'unregisterDynamicConnector'>;
  logger: Logger;
  tenantKey: string;
}): void => {
  actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID);
  actions.registerDynamicConnector(buildConnector(tenantKey));
  logger.debug(`Registered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
};

/** Withdraw the connector once the workspace is no longer connected. */
export const unregisterElasticAppsSlackConnector = ({
  actions,
  logger,
}: {
  actions: Pick<PluginStartContract, 'unregisterDynamicConnector'>;
  logger: Logger;
}): void => {
  if (actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID)) {
    logger.debug(`Unregistered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
  }
};
