/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RECOMMENDED_CONNECTOR_IDS: readonly string[] = [
  'Anthropic-Claude-Sonnet-4-5',
  'OpenAI-GPT-5-2',
  'Google-Gemini-2-5-Pro',
  'OpenAI-GPT-OSS-120B',
] as const;

const RECOMMENDED_SET = new Set<string>(RECOMMENDED_CONNECTOR_IDS);

export function isRecommendedConnector(connectorId: string): boolean {
  return RECOMMENDED_SET.has(connectorId);
}

export function getFirstRecommendedConnectorId(connectorIds: string[]): string | undefined {
  const idSet = new Set(connectorIds);
  for (const id of RECOMMENDED_CONNECTOR_IDS) {
    if (idSet.has(id)) return id;
  }
  return undefined;
}
