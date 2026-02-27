/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IdentifySystemsOptions, IdentifySystemsResult } from '@kbn/streams-ai';
import { generateStreamDescription, identifySystems, sumTokens } from '@kbn/streams-ai';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { withSpan } from '@kbn/apm-utils';

export async function identifySystemsWithDescription(
  options: IdentifySystemsOptions
): Promise<IdentifySystemsResult> {
  const result = await identifySystems(options);

  options.logger.trace('Generating descriptions for identified systems');

  let totalTokensUsed: ChatCompletionTokenCount = result.tokensUsed;
  const systemsWithDescription = await withSpan('generate_system_descriptions', () =>
    Promise.all(
      result.systems.map(async (system) => {
        const { description, tokensUsed } = await generateStreamDescription({
          stream: options.stream,
          system,
          start: options.start,
          end: options.end,
          esClient: options.esClient,
          inferenceClient: options.inferenceClient,
          signal: options.signal,
          logger: options.logger,
          systemPrompt: options.descriptionPrompt,
        });

        totalTokensUsed = sumTokens(totalTokensUsed, tokensUsed);
        return { ...system, description };
      })
    )
  );

  return { systems: systemsWithDescription, tokensUsed: totalTokensUsed };
}
