/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { v5 } from 'uuid';
import type { HttpHandler } from '@kbn/core/public';
import { isAxiosError } from 'axios';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * When running locally, only UUIDs are allowed for non-preconfigured connectors.
 * We generate a deterministic UUID from the logical connector id so runs are stable/idempotent.
 */
export function getConnectorIdAsUuid(connectorId: string) {
  return v5(connectorId, v5.DNS);
}

/**
 * Returns the connector id to use at runtime.
 * When `KBN_EVALS_SKIP_CONNECTOR_SETUP` is set, the original id is returned as-is
 * (preconfigured connectors don't need UUID mapping).
 * Otherwise, a deterministic UUID is generated.
 */
export function resolveConnectorId(connectorId: string): string {
  return process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP
    ? connectorId
    : getConnectorIdAsUuid(connectorId);
}

export async function createConnectorFixture({
  predefinedConnector,
  fetch,
  log,
  use,
}: {
  predefinedConnector: AvailableConnectorWithId;
  fetch: HttpHandler;
  log: ToolingLog;
  use: (connector: AvailableConnectorWithId) => Promise<void>;
}) {
  if (process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP) {
    log.info(
      `Skipping connector setup/teardown for: ${predefinedConnector.id} (KBN_EVALS_SKIP_CONNECTOR_SETUP is set)`
    );
    await use(predefinedConnector);
    return;
  }

  // When running locally, the connectors we read from kibana.yml
  // are not configured in the kibana instance, so we install the
  // one for this test run. only UUIDs are allowed for non-preconfigured
  // connectors, so we generate a seeded uuid using the preconfigured
  // connector id.
  const connectorIdAsUuid = getConnectorIdAsUuid(predefinedConnector.id);

  const connectorWithUuid = {
    ...predefinedConnector,
    id: connectorIdAsUuid,
  };

  async function deleteConnector() {
    await fetch({
      path: `/api/actions/connector/${connectorIdAsUuid}`,
      method: 'DELETE',
    }).catch((error) => {
      if (isAxiosError(error) && error.status === 404) {
        return;
      }
      throw error;
    });
  }

  log.info(`Deleting existing connector: ${predefinedConnector.id} as ${connectorIdAsUuid}`);

  await deleteConnector();

  log.info(`Creating connector`);

  await fetch({
    path: `/api/actions/connector/${connectorWithUuid.id}`,
    method: 'POST',
    body: JSON.stringify({
      config: connectorWithUuid.config,
      connector_type_id: connectorWithUuid.actionTypeId,
      name: connectorWithUuid.name,
      secrets: connectorWithUuid.secrets,
    }),
  });

  await use(connectorWithUuid);

  // teardown
  log.info(`Deleting connector: ${predefinedConnector.id} as ${connectorIdAsUuid}`);
  await deleteConnector();
}
