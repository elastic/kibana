/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import type { CliContext } from '../types';
import { Formatter } from '../output/formatter';
import { confirm, closePrompt } from '../prompts/prompt';
import { EXIT_CODES } from '../types';

export const deleteCommand: Command<CliContext> = {
  name: 'delete',
  description: 'Delete a stream',
  usage: 'delete <name> [--yes]',
  flags: {},
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const skipConfirm = flagsReader.boolean('yes');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: delete <name>');
    }

    try {
      // Confirm deletion unless --yes flag is provided
      if (!skipConfirm && !isJsonMode && process.stdin.isTTY) {
        const confirmed = await confirm(`Are you sure you want to delete stream '${name}'?`);
        closePrompt();

        if (!confirmed) {
          formatter.message('Operation cancelled.');
          process.exitCode = EXIT_CODES.USER_CANCELLED;
          return;
        }
      }

      await httpClient.deletePublic(`/api/streams/${encodeURIComponent(name)}`);

      formatter.acknowledged(`Stream '${name}' deleted`);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
