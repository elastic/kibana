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

export const forkCommand: Command<CliContext> = {
  name: 'fork',
  description: 'Fork a stream',
  usage: 'fork <parent-name> --child <child-name> --condition <json>',
  flags: {
    string: ['child', 'condition', 'status'],
    help: `
      --child <name>       Name of the child stream to create
      --condition <json>   JSON condition for routing (or 'never' for disabled)
      --status <status>    Optional routing status: enabled or disabled
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const parentName = flags._[0];
    if (!parentName) {
      throw createFlagError('Parent stream name is required. Usage: fork <parent-name> --child <child-name> --condition <json>');
    }

    const childName = flagsReader.string('child');
    if (!childName) {
      throw createFlagError('--child flag is required');
    }

    const conditionStr = flagsReader.string('condition');
    if (!conditionStr) {
      throw createFlagError('--condition flag is required');
    }

    const status = flagsReader.string('status');

    try {
      // Parse condition - 'never' is a special case
      let condition: unknown;
      if (conditionStr.toLowerCase() === 'never') {
        condition = { never: {} };
      } else {
        condition = JSON.parse(conditionStr);
      }

      const body: Record<string, unknown> = {
        stream: { name: childName },
        where: condition,
      };

      if (status) {
        body.status = status;
      }

      await httpClient.postPublic(`/api/streams/${encodeURIComponent(parentName)}/_fork`, body);

      formatter.acknowledged(`Stream '${childName}' forked from '${parentName}'`);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        formatter.error(`Invalid JSON in --condition: ${error.message}`);
      } else {
        formatter.error(error.message, error.statusCode);
      }
      process.exitCode = 1;
    }
  },
};
