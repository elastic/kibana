/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runRecipe } from '@kbn/inference-cli';
import { createFlagError } from '@kbn/dev-cli-errors';

import { generateReasoningPrompts } from '../src/flows/reasoning/generate_reasoning_prompts';

runRecipe(
  {
    name: 'generate_reasoning_prompts',
    flags: {
      string: ['input'],
    },
  },
  async ({ log, inferenceClient, flags }) => {
    let inputText = '';

    // Prefer piped stdin over the --input flag
    if (!process.stdin.isTTY) {
      inputText = await new Promise<string>((resolve, reject) => {
        let buf = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => (buf += chunk));
        process.stdin.on('end', () => resolve(buf.trim()));
        process.stdin.on('error', reject);
      });
    }

    // Fallback to --input flag if no stdin was provided
    if (!inputText) {
      inputText = flags.input as string;
    }

    if (!inputText) {
      throw createFlagError('Provide input via piped stdin or --input flag');
    }

    log.info(`Generating prompts...`);

    const response = await generateReasoningPrompts({
      inferenceClient,
      taskDescriptionTemplate: inputText,
    });

    process.stdout.write('\n' + response);
  }
);
