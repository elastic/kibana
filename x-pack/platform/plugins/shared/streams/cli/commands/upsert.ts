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
import { readJsonInput } from '../prompts/prompt';

export const upsertCommand: Command<CliContext> = {
  name: 'upsert',
  description: 'Create or update a stream',
  usage: 'upsert <name> --file <path> | --stdin',
  flags: {
    string: ['file'],
    boolean: ['stdin'],
    help: `
      --file <path>    Read stream definition from JSON file
      --stdin          Read stream definition from stdin
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: upsert <name> --file <path>');
    }

    const filePath = flagsReader.string('file');
    const useStdin = flagsReader.boolean('stdin');

    if (!filePath && !useStdin) {
      throw createFlagError('Either --file or --stdin is required');
    }

    try {
      const body = await readJsonInput(filePath);

      await httpClient.putPublic(`/api/streams/${encodeURIComponent(name)}`, body);

      formatter.acknowledged(`Stream '${name}' upserted`);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
