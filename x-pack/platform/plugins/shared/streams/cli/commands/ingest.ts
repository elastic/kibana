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

export const ingestGetCommand: Command<CliContext> = {
  name: 'ingest-get',
  description: 'Get ingest configuration for a stream',
  usage: 'ingest-get <name>',
  flags: {},
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: ingest-get <name>');
    }

    try {
      const response = await httpClient.getPublic<{ ingest: unknown }>(
        `/api/streams/${encodeURIComponent(name)}/_ingest`
      );

      if (isJsonMode) {
        formatter.json(response);
      } else {
        formatter.message(`Ingest configuration for stream '${name}':`);
        formatter.json(response.ingest);
      }
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const ingestSetCommand: Command<CliContext> = {
  name: 'ingest-set',
  description: 'Set ingest configuration for a stream',
  usage: 'ingest-set <name> --file <path> | --stdin',
  flags: {
    string: ['file'],
    boolean: ['stdin'],
    help: `
      --file <path>    Read ingest configuration from JSON file
      --stdin          Read ingest configuration from stdin
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: ingest-set <name> --file <path>');
    }

    const filePath = flagsReader.string('file');
    const useStdin = flagsReader.boolean('stdin');

    if (!filePath && !useStdin) {
      throw createFlagError('Either --file or --stdin is required');
    }

    try {
      const ingestConfig = await readJsonInput(filePath);
      const body = { ingest: ingestConfig };

      await httpClient.putPublic(`/api/streams/${encodeURIComponent(name)}/_ingest`, body);

      formatter.acknowledged(`Ingest configuration updated for stream '${name}'`);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
