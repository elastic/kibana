/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScriptInferenceClient } from '../util/kibana_client';
import { enrichDocumentationPrompt } from './prompts';
import { bindOutput } from './utils/output_executor';

/**
 * Enriches documentation by adding natural language descriptions for each ES|QL query example.
 * Uses the connectorId from the inferenceClient to connect and enrich the extracted content.
 *
 * @param content - The markdown content to enrich
 * @param inferenceClient - The inference client with connectorId and output API
 * @returns The enriched content with natural language descriptions for ES|QL queries
 */
export async function enrichDocumentation({
  content,
  inferenceClient,
}: {
  content: string;
  inferenceClient: ScriptInferenceClient;
}): Promise<string> {
  const callOutput = bindOutput({
    connectorId: inferenceClient.getConnectorId(),
    output: inferenceClient.output,
  });

  const enrichedContent = await callOutput(
    enrichDocumentationPrompt({
      content,
    })
  );

  return enrichedContent;
}
