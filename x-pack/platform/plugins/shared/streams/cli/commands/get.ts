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

export const getCommand: Command<CliContext> = {
  name: 'get',
  description: 'Get a stream definition',
  usage: 'get <name>',
  flags: {},
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: get <name>');
    }

    try {
      const response = await httpClient.getPublic<Record<string, unknown>>(
        `/api/streams/${encodeURIComponent(name)}`
      );

      formatter.stream({ name, ...response });
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
