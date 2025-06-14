/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import reasoningMetaPrompt from '../prompts/reasoning/reasoning_meta_prompt.text';
import reasoningSystemPrompt from '../prompts/reasoning/reasoning_system_prompt.text';

run(
  async ({ log, flagsReader, addCleanupTask }) => {
    const controller = new AbortController();
    addCleanupTask(() => controller.abort());

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
      inputText = flagsReader.string('input') ?? '';
    }

    if (!inputText) {
      throw createFlagError('Provide input via piped stdin or --input flag');
    }

    const divider = '=========================================';

    const output = [
      reasoningMetaPrompt,
      divider,
      'System prompt',
      divider,
      reasoningSystemPrompt,
      divider,
      'Task description',
      divider,
      inputText,
    ].join('\n\n');

    log.info(output);
  },
  {
    flags: {
      string: ['input'],
      help: `
        --input=<string>  Input text when not provided via stdin (stdin has precedence).
      `,
    },
  }
);
