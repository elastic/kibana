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

export const significantEventsReadCommand: Command<CliContext> = {
  name: 'significant-events-read',
  description: 'Read significant events for a stream',
  usage: 'significant-events-read <stream-name> --from <date> --to <date> --bucket-size <size>',
  flags: {
    string: ['from', 'to', 'bucket-size', 'query'],
    help: `
      --from <date>        Start date (ISO format)
      --to <date>          End date (ISO format)
      --bucket-size <size> Bucket size for aggregation (e.g., "1h", "1d")
      --query <query>      Optional query string to filter events
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required');
    }

    const from = flagsReader.string('from');
    const to = flagsReader.string('to');
    const bucketSize = flagsReader.string('bucket-size');

    if (!from || !to || !bucketSize) {
      throw createFlagError('--from, --to, and --bucket-size are required');
    }

    try {
      const query: Record<string, string> = { from, to, bucketSize };
      const queryStr = flagsReader.string('query');
      if (queryStr) {
        query.query = queryStr;
      }

      const response = await httpClient.getPublic<Record<string, unknown>>(
        `/api/streams/${encodeURIComponent(name)}/significant_events`,
        query
      );

      formatter.json(response);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const significantEventsPreviewCommand: Command<CliContext> = {
  name: 'significant-events-preview',
  description: 'Preview significant events based on a query',
  usage: 'significant-events-preview <stream-name> --from <date> --to <date> --bucket-size <size> --file <path> | --stdin',
  flags: {
    string: ['from', 'to', 'bucket-size', 'file'],
    boolean: ['stdin'],
    help: `
      --from <date>        Start date (ISO format)
      --to <date>          End date (ISO format)
      --bucket-size <size> Bucket size for aggregation
      --file <path>        Read query from JSON file
      --stdin              Read query from stdin
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required');
    }

    const from = flagsReader.string('from');
    const to = flagsReader.string('to');
    const bucketSize = flagsReader.string('bucket-size');

    if (!from || !to || !bucketSize) {
      throw createFlagError('--from, --to, and --bucket-size are required');
    }

    const filePath = flagsReader.string('file');
    const useStdin = flagsReader.boolean('stdin');

    if (!filePath && !useStdin) {
      throw createFlagError('Either --file or --stdin is required');
    }

    try {
      const body = await readJsonInput(filePath);

      const response = await httpClient.postPublic<Record<string, unknown>>(
        `/api/streams/${encodeURIComponent(name)}/significant_events/_preview`,
        body,
        { from, to, bucketSize }
      );

      formatter.json(response);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const significantEventsGenerateCommand: Command<CliContext> = {
  name: 'significant-events-generate',
  description: 'Generate significant events using AI (SSE streaming)',
  usage: 'significant-events-generate <stream-name> --from <date> --to <date> [options]',
  flags: {
    string: ['from', 'to', 'connector-id', 'sample-docs-size'],
    help: `
      --from <date>             Start date (ISO format)
      --to <date>               End date (ISO format)
      --connector-id <id>       Optional AI connector ID
      --sample-docs-size <num>  Number of sample documents to use
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required');
    }

    const from = flagsReader.string('from');
    const to = flagsReader.string('to');

    if (!from || !to) {
      throw createFlagError('--from and --to are required');
    }

    try {
      const query: Record<string, string | number | undefined> = { from, to };

      const connectorId = flagsReader.string('connector-id');
      if (connectorId) {
        query.connectorId = connectorId;
      }

      const sampleDocsSize = flagsReader.string('sample-docs-size');
      if (sampleDocsSize) {
        query.sampleDocsSize = parseInt(sampleDocsSize, 10);
      }

      // Note: This endpoint returns SSE. For CLI, we'll just get the final response.
      // In a real implementation, you'd handle SSE streaming.
      const response = await httpClient.postPublic<Record<string, unknown>>(
        `/api/streams/${encodeURIComponent(name)}/significant_events/_generate`,
        {},
        query
      );

      formatter.json(response);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const significantEventsTaskCommand: Command<CliContext> = {
  name: 'significant-events-task',
  description: 'Manage significant events generation tasks',
  usage: 'significant-events-task <stream-name> <action> [options]',
  flags: {
    string: ['from', 'to', 'connector-id', 'sample-docs-size'],
    help: `
      Actions:
        status       Get task status
        schedule     Schedule generation task
        cancel       Cancel running task
        acknowledge  Acknowledge completed task

      Options (for schedule action):
        --from <date>             Start date (ISO format)
        --to <date>               End date (ISO format)
        --connector-id <id>       Optional AI connector ID
        --sample-docs-size <num>  Number of sample documents to use
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    const action = flags._[1];

    if (!name) {
      throw createFlagError('Stream name is required');
    }

    if (!action || !['status', 'schedule', 'cancel', 'acknowledge'].includes(action)) {
      throw createFlagError('Action is required: status, schedule, cancel, or acknowledge');
    }

    try {
      if (action === 'status') {
        const response = await httpClient.getInternal<Record<string, unknown>>(
          `/internal/streams/${encodeURIComponent(name)}/significant_events/_status`
        );
        formatter.taskStatus(response);
        return;
      }

      // For schedule, cancel, acknowledge - POST to _task endpoint
      let body: Record<string, unknown> = { action };

      if (action === 'schedule') {
        const from = flagsReader.string('from');
        const to = flagsReader.string('to');

        if (!from || !to) {
          throw createFlagError('--from and --to are required for schedule action');
        }

        body = {
          action: 'schedule',
          from,
          to,
        };

        const connectorId = flagsReader.string('connector-id');
        if (connectorId) {
          body.connectorId = connectorId;
        }

        const sampleDocsSize = flagsReader.string('sample-docs-size');
        if (sampleDocsSize) {
          body.sampleDocsSize = parseInt(sampleDocsSize, 10);
        }
      }

      const response = await httpClient.postInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(name)}/significant_events/_task`,
        body
      );

      formatter.taskStatus(response);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
