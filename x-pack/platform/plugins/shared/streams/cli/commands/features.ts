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
import { readJsonInput, confirm, closePrompt } from '../prompts/prompt';
import { EXIT_CODES } from '../types';

export const featuresListCommand: Command<CliContext> = {
  name: 'features-list',
  description: 'List features for a stream',
  usage: 'features-list <stream-name> [--type <type>]',
  flags: {
    string: ['type'],
    help: `
      --type <type>    Filter features by type
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: features-list <stream-name>');
    }

    const type = flagsReader.string('type');

    try {
      const query: Record<string, string> = {};
      if (type) {
        query.type = type;
      }

      const response = await httpClient.getInternal<{ features: Array<{ id?: string; name?: string }> }>(
        `/internal/streams/${encodeURIComponent(name)}/features`,
        query
      );

      formatter.featureList(response.features);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const featuresUpsertCommand: Command<CliContext> = {
  name: 'features-upsert',
  description: 'Create or update a feature for a stream',
  usage: 'features-upsert <stream-name> --file <path> | --stdin',
  flags: {
    string: ['file'],
    boolean: ['stdin'],
    help: `
      --file <path>    Read feature definition from JSON file
      --stdin          Read feature definition from stdin
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: features-upsert <stream-name> --file <path>');
    }

    const filePath = flagsReader.string('file');
    const useStdin = flagsReader.boolean('stdin');

    if (!filePath && !useStdin) {
      throw createFlagError('Either --file or --stdin is required');
    }

    try {
      const body = await readJsonInput(filePath);

      await httpClient.postInternal(`/internal/streams/${encodeURIComponent(name)}/features`, body);

      formatter.acknowledged('Feature upserted');
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const featuresDeleteCommand: Command<CliContext> = {
  name: 'features-delete',
  description: 'Delete a feature from a stream',
  usage: 'features-delete <stream-name> --id <feature-id> [--yes]',
  flags: {
    string: ['id'],
    help: `
      --id <id>        ID of the feature to delete
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const skipConfirm = flagsReader.boolean('yes');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: features-delete <stream-name> --id <feature-id>');
    }

    const featureId = flagsReader.string('id');
    if (!featureId) {
      throw createFlagError('--id flag is required');
    }

    try {
      // Confirm deletion unless --yes flag is provided
      if (!skipConfirm && !isJsonMode && process.stdin.isTTY) {
        const confirmed = await confirm(`Are you sure you want to delete feature '${featureId}'?`);
        closePrompt();

        if (!confirmed) {
          formatter.message('Operation cancelled.');
          process.exitCode = EXIT_CODES.USER_CANCELLED;
          return;
        }
      }

      await httpClient.deleteInternal(
        `/internal/streams/${encodeURIComponent(name)}/features/${encodeURIComponent(featureId)}`
      );

      formatter.acknowledged('Feature deleted');
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const featuresBulkCommand: Command<CliContext> = {
  name: 'features-bulk',
  description: 'Bulk upsert or delete features for a stream',
  usage: 'features-bulk <stream-name> --file <path> | --stdin',
  flags: {
    string: ['file'],
    boolean: ['stdin'],
    help: `
      --file <path>    Read bulk operations from JSON file
      --stdin          Read bulk operations from stdin

      Input format: { "operations": [{ "index": { "feature": {...} } }, { "delete": { "id": "..." } }] }
    `,
  },
  run: async ({ httpClient, flagsReader, log, flags }) => {
    const isJsonMode = flagsReader.boolean('json');
    const formatter = new Formatter({ log, isJsonMode });

    const name = flags._[0];
    if (!name) {
      throw createFlagError('Stream name is required. Usage: features-bulk <stream-name> --file <path>');
    }

    const filePath = flagsReader.string('file');
    const useStdin = flagsReader.boolean('stdin');

    if (!filePath && !useStdin) {
      throw createFlagError('Either --file or --stdin is required');
    }

    try {
      const body = await readJsonInput(filePath);

      await httpClient.postInternal(`/internal/streams/${encodeURIComponent(name)}/features/_bulk`, body);

      formatter.acknowledged('Bulk operation completed');
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};

export const featuresIdentifyCommand: Command<CliContext> = {
  name: 'features-identify',
  description: 'Manage feature identification tasks',
  usage: 'features-identify <stream-name> <action> [options]',
  flags: {
    string: ['from', 'to', 'connector-id'],
    help: `
      Actions:
        status       Get task status
        schedule     Schedule identification task
        cancel       Cancel running task
        acknowledge  Acknowledge completed task

      Options (for schedule action):
        --from <date>          Start date (ISO format)
        --to <date>            End date (ISO format)
        --connector-id <id>    Optional AI connector ID
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
          `/internal/streams/${encodeURIComponent(name)}/features/_status`
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
          body.connector_id = connectorId;
        }
      }

      const response = await httpClient.postInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(name)}/features/_task`,
        body
      );

      formatter.taskStatus(response);
    } catch (error: any) {
      formatter.error(error.message, error.statusCode);
      process.exitCode = 1;
    }
  },
};
