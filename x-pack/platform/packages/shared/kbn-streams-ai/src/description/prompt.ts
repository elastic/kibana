/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import descriptionSystemPrompt from './system_prompt.text';
import descriptionUserPrompt from './user_prompt.text';

export { descriptionSystemPrompt as descriptionPrompt };

export function createGenerateStreamDescriptionPrompt({ systemPrompt }: { systemPrompt: string }) {
  return createPrompt({
    name: 'generate_stream_description',
    input: z.object({
      name: z.string(),
      dataset_analysis: z.string(),
    }),
  })
    .version({
      system: {
        mustache: {
          template: systemPrompt,
        },
      },
      template: {
        mustache: {
          template: descriptionUserPrompt,
        },
      },
    })
    .get();
}
