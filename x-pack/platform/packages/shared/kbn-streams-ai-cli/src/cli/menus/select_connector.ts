/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ora from 'ora';
import type { InferenceConnector } from '@kbn/inference-common';
import { promptList, withBackChoice, isBack } from '../prompt/prompt';
import type { ConnectorsService } from '../services/connectors_service';

export async function selectConnector({
  connectorsService,
  signal,
  statusLine,
  currentConnectorId,
}: {
  connectorsService: ConnectorsService;
  signal: AbortSignal;
  statusLine: string;
  currentConnectorId?: string;
}): Promise<InferenceConnector | undefined> {
  const spinner = ora('Loading connectors').start();

  try {
    const connectors = await connectorsService.list(signal);
    spinner.succeed('Connectors loaded');

    if (!connectors.length) {
      throw new Error('No inference connectors are available.');
    }

    const selection = await promptList<string>({
      message: `Select connector\n${statusLine}\nChoose a connector:`,
      choices: withBackChoice(
        connectors.map((connector) => ({
          name: `${connector.name} (${connector.connectorId})${
            connector.connectorId === currentConnectorId ? ' (current)' : ''
          }`,
          value: connector.connectorId,
        }))
      ),
      defaultValue: currentConnectorId,
    });

    if (isBack(selection)) {
      return undefined;
    }

    return connectors.find((connector) => connector.connectorId === selection);
  } catch (error) {
    spinner.fail('Failed to load connectors');
    throw error;
  }
}
