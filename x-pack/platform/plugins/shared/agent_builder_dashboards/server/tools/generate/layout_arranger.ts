/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import {
  buildLayoutPrompt,
  getErrorMessage,
  parseLayoutAnswer,
  type ArrangeDashboardLayout,
} from '@kbn/dashboard-agent-authoring';

const MAX_ATTEMPTS = 2;

type LayoutMessage = ['system' | 'human' | 'ai', string];

/**
 * Arranges dashboard containers with a dedicated model call, answered in text like the Lens config
 * call: a failed tool call would be retried by the inference plugin, whose streamed retry appends
 * the failed attempt's arguments to the new ones. An unreadable answer is asked for again once.
 * Errors propagate to the layout step, which keeps the current layout.
 */
export const createLayoutArranger =
  ({ modelProvider }: { modelProvider: ModelProvider }): ArrangeDashboardLayout =>
  async (request) => {
    const { chatModel } = await modelProvider.getDefaultModel();
    const { system, user } = buildLayoutPrompt(request);
    const messages: LayoutMessage[] = [
      ['system', system],
      ['human', user],
    ];

    let lastError = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await chatModel.invoke(messages);
      try {
        return parseLayoutAnswer(response.text);
      } catch (error) {
        const outputTokens = response.usage_metadata?.output_tokens ?? 'unknown';
        lastError = `${getErrorMessage(
          error
        )} (output tokens: ${outputTokens}, text: ${JSON.stringify(response.text.slice(0, 500))})`;
        messages.push(
          ['ai', response.text],
          [
            'human',
            `Your answer could not be read: ${getErrorMessage(
              error
            )}. Answer again with the complete JSON object in a \`json\` code block.`,
          ]
        );
      }
    }
    throw new Error(lastError);
  };
