/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HarnessTarget } from './clients';
import { harnessPaths } from './workspace';

export interface ModelChoice {
  connectorId: string;
  inferenceId: string;
  label: string;
}

/**
 * Inference endpoints the loop is allowed to search over.
 *
 * Deliberately a short, hand-picked list spanning families and price points rather than every
 * endpoint on the cluster: the model slot is one slot among eight, and letting the proposer pick
 * from 55 options turns the round into model shopping instead of harness design.
 */
export const DEFAULT_MODEL_CANDIDATES: string[] = [
  'openai-gpt-5.4-mini',
  'openai-gpt-5.4',
  'anthropic-claude-5.5-haiku',
  'anthropic-claude-5.5-sonnet',
  'google-gemini-3.8-flash',
];

const kibanaFetch = async (
  target: HarnessTarget,
  path: string,
  init: RequestInit = {}
): Promise<Response> =>
  fetch(`${target.kibanaUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'harness-opt',
      authorization: `Basic ${Buffer.from(`${target.username}:${target.password}`).toString(
        'base64'
      )}`,
      ...(init.headers ?? {}),
    },
  });

/**
 * Create one `.inference` connector per candidate endpoint and record the mapping.
 *
 * `getModelById({ connectorId })` is how the tool pins a model, so a connector has to exist for
 * every model the loop may propose. Existing connectors with the same name are reused.
 */
export const setupModelConnectors = async ({
  target,
  log,
  inferenceIds = DEFAULT_MODEL_CANDIDATES,
}: {
  target: HarnessTarget;
  log: ToolingLog;
  inferenceIds?: string[];
}): Promise<ModelChoice[]> => {
  const existingResponse = await kibanaFetch(target, '/api/actions/connectors');
  const existing = (await existingResponse.json()) as Array<{
    id: string;
    name: string;
    connector_type_id: string;
  }>;

  const choices: ModelChoice[] = [];

  for (const modelId of inferenceIds) {
    // A connector owns its inference endpoint, so the loop creates its own endpoint ids rather
    // than binding to the cluster's preconfigured ones (which Kibana refuses to re-create).
    const inferenceId = `harness-opt-${modelId}`;
    const name = `harness-opt ${modelId}`;
    const found = existing.find((connector) => connector.name === name);
    if (found) {
      choices.push({ connectorId: found.id, inferenceId, label: name });
      continue;
    }

    const response = await kibanaFetch(target, '/api/actions/connector', {
      method: 'POST',
      body: JSON.stringify({
        name,
        connector_type_id: '.inference',
        config: {
          provider: 'elastic',
          taskType: 'chat_completion',
          inferenceId,
          providerConfig: { model_id: modelId },
        },
        secrets: {},
      }),
    });

    if (!response.ok) {
      log.warning(
        `[models] could not create connector for ${inferenceId}: ${await response.text()}`
      );
      continue;
    }

    const created = (await response.json()) as { id: string };
    choices.push({ connectorId: created.id, inferenceId, label: name });
  }

  const path = Path.join(harnessPaths().root, 'models.json');
  Fs.writeFileSync(path, `${JSON.stringify(choices, null, 2)}\n`);
  log.info(`[models] ${choices.length} model connectors available (${path})`);
  return choices;
};

/** Model choices recorded by `setup-models`, for the proposer prompt and for reports. */
export const readModelChoices = (): ModelChoice[] => {
  const path = Path.join(harnessPaths().root, 'models.json');
  return Fs.existsSync(path) ? (JSON.parse(Fs.readFileSync(path, 'utf8')) as ModelChoice[]) : [];
};
