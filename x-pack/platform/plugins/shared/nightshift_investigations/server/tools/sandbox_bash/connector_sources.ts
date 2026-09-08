/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { AlertHistoryEsIndexConnectorId } from '@kbn/actions-plugin/common';
import type { SeedConnector } from './connector_env';

/** Returns a (request-scoped) list of connectors to seed. Part 2 widens the implementation. */
export type ConnectorSource = (request: KibanaRequest) => Promise<SeedConnector[]>;

/**
 * True for kibana.yml `xpack.actions.preconfigured` connectors only.
 *
 * The inMemoryConnectors array is a mixed bag:
 * - isDynamic: true — set by registerDynamicConnector (e.g. EIS inference endpoints from
 *   search_inference_endpoints); these are runtime registrations, not kibana.yml entries.
 * - isSystemAction: true — system actions, never user-facing.
 * - AlertHistoryEsIndexConnectorId — built-in preconfigured connector with empty secrets;
 *   would add a noise block to .env.
 */
const isKibanaYmlConnector = (c: InMemoryConnector): boolean =>
  c.isPreconfigured === true &&
  c.isSystemAction === false &&
  c.isDynamic !== true &&
  c.id !== AlertHistoryEsIndexConnectorId;

/**
 * Connector source that yields only connectors defined in `kibana.yml` under
 * `xpack.actions.preconfigured`. Requires no changes to the actions plugin.
 *
 * The request is used to call `actionsClient.getAll()`, which is the authorization gate —
 * it enforces `ensureAuthorized({ operation: 'get' })` and emits the connector GET audit
 * event. It returns no secrets, so it is used purely as the gate and name/type source.
 * `inMemoryConnectors` then supplies the secrets for the ids that passed the gate.
 *
 * IMPORTANT: The array is read lazily on every call. `detectPreconfiguredConflicts` splices
 * conflicting entries out of it asynchronously during start() (actions/server/plugin.ts:1017),
 * so snapshotting at setup() would capture a stale list.
 */
export const preconfiguredConnectorSource =
  (
    getActions: () => ActionsPluginStart | undefined,
    getActionsClient: (req: KibanaRequest) => Promise<PublicMethodsOf<ActionsClient>>
  ): ConnectorSource =>
  async (request) => {
    const actions = getActions();
    if (!actions) return [];

    const actionsClient = await getActionsClient(request);
    const authorized = await actionsClient.getAll({ includeSystemActions: false });
    const authorizedIds = new Set(authorized.map(({ id }) => id));

    return actions.inMemoryConnectors
      .filter((c) => isKibanaYmlConnector(c) && authorizedIds.has(c.id))
      .map(({ id, name, actionTypeId, config, secrets }) => ({
        id,
        name,
        actionTypeId,
        config: (config ?? {}) as Record<string, unknown>,
        secrets: (secrets ?? {}) as Record<string, unknown>,
      }));
  };
