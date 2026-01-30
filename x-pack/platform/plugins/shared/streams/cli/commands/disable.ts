/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { CliContext } from '../types';
import { Formatter } from '../output/formatter';
import { confirm, closePrompt } from '../prompts/prompt';
import { EXIT_CODES } from '../types';

export const disableCommand: Command<CliContext> = {
  name: 'disable',
  description: 'Disable wired streams (destructive - deletes all stream data)',
  usage: 'disable [--yes]',
  flags: {},
  run: async ({ httpClient, flagsReader, log }) => {
    const isJsonMode = flagsReader.boolean('json');
    const skipConfirm = flagsReader.boolean('yes');
    const formatter = new Formatter({ log, isJsonMode });

    try {
      // Confirm unless --yes flag is provided
      if (!skipConfirm && !isJsonMode && process.stdin.isTTY) {
        formatter.warning('This will delete all wired stream definitions and data!');
        const confirmed = await confirm('Are you sure you want to disable streams?');
        closePrompt();

        if (!confirmed) {
          formatter.message('Operation cancelled.');
          process.exitCode = EXIT_CODES.USER_CANCELLED;
          return;
        }
      }

      await httpClient.postPublic('/api/streams/_disable');

      formatter.acknowledged('Streams disabled');
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
