/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { CliContext } from '../types';
import { Formatter } from '../output/formatter';

export const statusCommand: Command<CliContext> = {
  name: 'status',
  description: 'Get streams status',
  usage: 'status',
  flags: {},
  run: async ({ httpClient, flagsReader, log }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    try {
      // Note: This endpoint is internal, not versioned
      const response = await httpClient.getInternal<{ enabled: boolean | 'conflict'; can_manage: boolean }>(
        '/api/streams/_status'
      );

      formatter.taskStatus(response);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
