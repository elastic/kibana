/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import inquirer from 'inquirer';
import { InferenceConnector } from '@kbn/inference-common';
import { KibanaClient } from '@kbn/kibana-api-cli';
import { getConnectors } from './get_connector';
import { ensureEisConnector } from './eis/ensure_eis_connector';

export async function selectConnector({
  log,
  kibanaClient,
  prompt = true,
  preferredConnectorId,
  setupEis,
  signal,
}: {
  log: ToolingLog;
  kibanaClient: KibanaClient;
  prompt?: boolean;
  preferredConnectorId?: string;
  setupEis?: boolean;
  signal: AbortSignal;
}): Promise<InferenceConnector> {
  const connectors = await getConnectors(kibanaClient);

  if (!connectors.length && !setupEis) {
    throw new Error(
      `No connectors available. Re-run with --setup-eis to set up a connector to EIS`
    );
  }

  if (!connectors.length && setupEis) {
    const eisConnectorId = await ensureEisConnector({
      kibanaClient,
      log,
      signal,
    });

    return await selectConnector({
      log,
      kibanaClient,
      signal,
      prompt,
      setupEis: false,
      preferredConnectorId: eisConnectorId,
    });
  }

  const connector = connectors.find((item) => item.connectorId === preferredConnectorId);

  if (!connector && preferredConnectorId) {
    log.warning(`Could not find connector ${preferredConnectorId}`);
  }

  const firstConnector = connectors[0];

  const onlyOneConnector = connectors.length === 1;

  if (onlyOneConnector) {
    log.debug('Using the only connector found');
    return firstConnector;
  }

  if (prompt) {
    const connectorChoice = await inquirer.prompt({
      type: 'list',
      name: 'connector',
      message: `Select a connector`,
      choices: connectors.map((item) => ({
        name: `${item.name} (${item.connectorId})`,
        value: item.connectorId,
      })),
    });

    const selectedConnector = connectors.find(
      (item) => item.connectorId === connectorChoice.connector
    )!;

    return selectedConnector;
  }

  return firstConnector;
}
