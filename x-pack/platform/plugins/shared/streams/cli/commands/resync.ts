/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { CliContext } from '../types';
import { Formatter } from '../output/formatter';

export const resyncCommand: Command<CliContext> = {
  name: 'resync',
  description: 'Resync all streams (ensures Elasticsearch assets are up to date)',
  usage: 'resync',
  flags: {},
  run: async ({ httpClient, flagsReader, log }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    try {
      const response = await httpClient.postPublic<Record<string, unknown>>('/api/streams/_resync');

      if (isJsonMode) {
        formatter.json(response);
      } else {
        formatter.acknowledged('Streams resynced');
      }
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
