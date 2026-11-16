/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StageContext } from './context';

const JUDGE_TIMEOUT_MS = 180_000;
const DEFAULT_CONNECTOR_SETTING = 'genAiSettings:defaultAIConnector';

/** The judge's connector: the flag, the config, Kibana's default AI connector, or the first one. */
export const resolveJudgeConnectorId = async (context: StageContext): Promise<string> => {
  const configured = context.judgeConnectorId ?? context.config.evaluate.connector_id;
  if (configured) {
    return configured;
  }
  const { data: settings } = await context.kibana<{
    settings: Record<string, { userValue?: unknown }>;
  }>('GET', '/internal/kibana/settings');
  const defaultConnector = settings.settings[DEFAULT_CONNECTOR_SETTING]?.userValue;
  if (typeof defaultConnector === 'string' && defaultConnector) {
    return defaultConnector;
  }
  const { data } = await context.kibana<{
    connectors: Array<{ connectorId: string; type: string }>;
  }>('GET', '/internal/inference/connectors');
  const connector = data.connectors.find(({ type }) => type === '.inference') ?? data.connectors[0];
  if (!connector) {
    throw new Error('No AI connector to judge with: pass --judge-connector');
  }
  return connector.connectorId;
};

/**
 * Asks the judge and parses its answer, once more when the call fails or the answer cannot be
 * read. `parse` returns `{ error }` for an answer it cannot read.
 */
export const askJudge = async <T>({
  context,
  connectorId,
  system,
  prompt,
  parse,
  attempts = 2,
}: {
  context: StageContext;
  connectorId: string;
  system: string;
  prompt: string;
  parse: (content: string) => T | { error: string };
  attempts?: number;
}): Promise<T | { error: string }> => {
  let result: T | { error: string } = { error: 'The judge was not asked' };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { data } = await context.kibana<{ content?: string }>(
        'POST',
        '/internal/inference/chat_complete',
        { connectorId, system, messages: [{ role: 'user', content: prompt }], temperature: 0 },
        { timeoutMs: JUDGE_TIMEOUT_MS }
      );
      result = parse(data.content ?? '');
    } catch (error) {
      result = { error: error instanceof Error ? error.message : String(error) };
    }
    if (!(result && typeof result === 'object' && 'error' in result)) {
      return result;
    }
  }
  return result;
};
