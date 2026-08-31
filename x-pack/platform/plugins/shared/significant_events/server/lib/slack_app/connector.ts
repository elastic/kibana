/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InMemoryConnector, PluginStartContract } from '@kbn/actions-plugin/server';
import { RELAY_AUTH_ID } from '@kbn/connector-specs';

/** The Elastic Slack app is not its own connector type — it is the `relay` auth method on this one. */
export const ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID = '.slack2';

/**
 * One instance per deployment, under a stable id: rules and workflows reference it directly, so it
 * must survive restarts and reconnects unchanged.
 */
export const ELASTIC_APPS_SLACK_CONNECTOR_ID = 'elastic-apps-slack';

const ELASTIC_APPS_SLACK_CONNECTOR_NAME = 'Slack (Elastic app)';

type DynamicConnectorActions = Pick<
  PluginStartContract,
  'registerDynamicConnector' | 'unregisterDynamicConnector' | 'inMemoryConnectors'
>;

const buildConnector = (tenantKey: string): InMemoryConnector => ({
  id: ELASTIC_APPS_SLACK_CONNECTOR_ID,
  actionTypeId: ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID,
  name: ELASTIC_APPS_SLACK_CONNECTOR_NAME,
  // The Relay holds the Slack credentials, so naming the workspace is all this needs. `config`
  // mirrors the auth type in plaintext, as `ensureConfigAuthType` does for saved connectors.
  config: { authType: RELAY_AUTH_ID },
  secrets: { authType: RELAY_AUTH_ID, tenantKey },
  isMissingSecrets: false,
  isPreconfigured: true,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
});

/**
 * Unregisters first because `registerDynamicConnector` is a no-op when the id is taken, so a
 * reconnect to a different workspace would otherwise keep serving the previous tenant key.
 *
 * Returns false when the id is held by a connector this app does not own (a preconfigured
 * `elastic-apps-slack` in `kibana.yml`): the unregister leaves it in place and the register is
 * refused, so callers must not treat the call as having taken effect.
 */
export const registerElasticAppsSlackConnector = ({
  actions,
  logger,
  tenantKey,
}: {
  actions: Pick<DynamicConnectorActions, 'registerDynamicConnector' | 'unregisterDynamicConnector'>;
  logger: Logger;
  tenantKey: string;
}): boolean => {
  actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID);
  if (!actions.registerDynamicConnector(buildConnector(tenantKey))) {
    return false;
  }
  logger.debug(`Registered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
  return true;
};

export const unregisterElasticAppsSlackConnector = ({
  actions,
  logger,
}: {
  actions: Pick<DynamicConnectorActions, 'unregisterDynamicConnector'>;
  logger: Logger;
}): void => {
  if (actions.unregisterDynamicConnector(ELASTIC_APPS_SLACK_CONNECTOR_ID)) {
    logger.debug(`Unregistered the ${ELASTIC_APPS_SLACK_CONNECTOR_ID} connector`);
  }
};

/**
 * Lets a reconcile tell "already correct" from "registered for the wrong workspace". Matches on
 * `isDynamic` as well as the id, because only dynamic connectors are ones this app registered and
 * can unregister: a foreign connector squatting the id must never read as already correct.
 */
export const getRegisteredTenantKey = (
  actions: Pick<DynamicConnectorActions, 'inMemoryConnectors'>
): string | undefined => {
  const connector = actions.inMemoryConnectors.find(
    ({ id, isDynamic }) => id === ELASTIC_APPS_SLACK_CONNECTOR_ID && isDynamic === true
  );
  const tenantKey = (connector?.secrets as { tenantKey?: unknown } | undefined)?.tenantKey;
  return typeof tenantKey === 'string' ? tenantKey : undefined;
};
