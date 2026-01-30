/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { CliContext } from '../types';
import { Formatter } from '../output/formatter';
import { select, confirm, input, closePrompt } from '../prompts/prompt';
import type { HttpClient } from '../http_client';

interface Stream {
  name: string;
  [key: string]: unknown;
}

export const interactiveCommand: Command<CliContext> = {
  name: 'interactive',
  description: 'Interactive mode for managing streams',
  usage: 'interactive',
  flags: {},
  run: async ({ httpClient, flagsReader, log }) => {
    const isJsonMode = flagsReader.boolean('json');

    if (isJsonMode) {
      log.error('Interactive mode is not available in JSON mode');
      process.exitCode = 2;
      return;
    }

    if (!process.stdin.isTTY) {
      log.error('Interactive mode requires a TTY. Use explicit commands for non-interactive use.');
      process.exitCode = 2;
      return;
    }

    const formatter = new Formatter({ log, isJsonMode: false });

    formatter.message('\nStreams CLI - Interactive Mode\n');

    try {
      await interactiveLoop(httpClient, formatter);
    } finally {
      closePrompt();
    }
  },
};

async function interactiveLoop(httpClient: HttpClient, formatter: Formatter): Promise<void> {
  while (true) {
    const mainAction = await select<
      'list' | 'create' | 'global' | 'exit'
    >('\nWhat would you like to do?', [
      { value: 'list', label: 'Manage existing stream' },
      { value: 'create', label: 'Create new stream' },
      { value: 'global', label: 'Global operations (enable/disable/resync/status)' },
      { value: 'exit', label: 'Exit' },
    ]);

    if (mainAction === 'exit') {
      formatter.message('Goodbye!');
      break;
    }

    if (mainAction === 'global') {
      await handleGlobalOperations(httpClient, formatter);
      continue;
    }

    if (mainAction === 'create') {
      await handleCreateStream(httpClient, formatter);
      continue;
    }

    // List and manage streams
    const streams = await fetchStreams(httpClient, formatter);
    if (!streams || streams.length === 0) {
      formatter.message('No streams found.');
      continue;
    }

    const streamChoices = streams.map((s) => ({
      value: s.name,
      label: s.name,
    }));
    streamChoices.push({ value: '__back__', label: '[Back]' });

    const selectedStream = await select<string>('Select a stream:', streamChoices);

    if (selectedStream === '__back__') {
      continue;
    }

    await handleStreamActions(httpClient, formatter, selectedStream);
  }
}

async function fetchStreams(
  httpClient: HttpClient,
  formatter: Formatter
): Promise<Stream[] | null> {
  try {
    const response = await httpClient.getPublic<{ streams: Stream[] }>('/api/streams');
    return response.streams;
  } catch (error: any) {
    formatter.error(`Failed to fetch streams: ${error.message}`);
    return null;
  }
}

async function handleGlobalOperations(
  httpClient: HttpClient,
  formatter: Formatter
): Promise<void> {
  const action = await select<'status' | 'enable' | 'disable' | 'resync' | 'back'>(
    'Global operations:',
    [
      { value: 'status', label: 'View streams status' },
      { value: 'enable', label: 'Enable streams' },
      { value: 'disable', label: 'Disable streams (destructive!)' },
      { value: 'resync', label: 'Resync streams' },
      { value: 'back', label: '[Back]' },
    ]
  );

  if (action === 'back') return;

  try {
    switch (action) {
      case 'status': {
        const response = await httpClient.getInternal<Record<string, unknown>>(
          '/api/streams/_status'
        );
        formatter.taskStatus(response);
        break;
      }
      case 'enable': {
        await httpClient.postPublic('/api/streams/_enable');
        formatter.success('Streams enabled successfully.');
        break;
      }
      case 'disable': {
        const confirmed = await confirm(
          'This will delete all wired stream definitions and data. Are you sure?'
        );
        if (confirmed) {
          await httpClient.postPublic('/api/streams/_disable');
          formatter.success('Streams disabled successfully.');
        } else {
          formatter.message('Operation cancelled.');
        }
        break;
      }
      case 'resync': {
        await httpClient.postPublic('/api/streams/_resync');
        formatter.success('Streams resynced successfully.');
        break;
      }
    }
  } catch (error: any) {
    formatter.error(error.message);
  }
}

async function handleCreateStream(httpClient: HttpClient, formatter: Formatter): Promise<void> {
  formatter.message('\nTo create a stream, you need to provide a JSON definition.');
  formatter.message('For now, use the non-interactive command:');
  formatter.message('  node scripts/streams_cli upsert <name> --file <path>\n');
}

async function handleStreamActions(
  httpClient: HttpClient,
  formatter: Formatter,
  streamName: string
): Promise<void> {
  while (true) {
    const action = await select<
      'view' | 'update' | 'delete' | 'fork' | 'ingest' | 'features' | 'events' | 'back'
    >(`\nActions for stream '${streamName}':`, [
      { value: 'view', label: 'View stream details' },
      { value: 'update', label: 'Update stream' },
      { value: 'delete', label: 'Delete stream' },
      { value: 'fork', label: 'Fork stream' },
      { value: 'ingest', label: 'Manage ingest settings' },
      { value: 'features', label: 'Manage features' },
      { value: 'events', label: 'Manage significant events' },
      { value: 'back', label: '[Back to stream list]' },
    ]);

    if (action === 'back') return;

    try {
      switch (action) {
        case 'view': {
          const response = await httpClient.getPublic<Record<string, unknown>>(
            `/api/streams/${encodeURIComponent(streamName)}`
          );
          formatter.stream({ name: streamName, ...response });
          break;
        }
        case 'delete': {
          const confirmed = await confirm(`Are you sure you want to delete '${streamName}'?`);
          if (confirmed) {
            await httpClient.deletePublic(`/api/streams/${encodeURIComponent(streamName)}`);
            formatter.success(`Stream '${streamName}' deleted.`);
            return; // Go back to stream list
          }
          break;
        }
        case 'fork': {
          await handleForkStream(httpClient, formatter, streamName);
          break;
        }
        case 'ingest': {
          await handleIngestActions(httpClient, formatter, streamName);
          break;
        }
        case 'features': {
          await handleFeatureActions(httpClient, formatter, streamName);
          break;
        }
        case 'events': {
          await handleSignificantEventsActions(httpClient, formatter, streamName);
          break;
        }
        case 'update': {
          formatter.message('\nTo update a stream, use the non-interactive command:');
          formatter.message(`  node scripts/streams_cli upsert ${streamName} --file <path>\n`);
          break;
        }
      }
    } catch (error: any) {
      formatter.error(error.message);
    }
  }
}

async function handleForkStream(
  httpClient: HttpClient,
  formatter: Formatter,
  parentName: string
): Promise<void> {
  const childName = await input('Enter child stream name');
  if (!childName) {
    formatter.message('Child name is required.');
    return;
  }

  formatter.message(
    'Enter a routing condition (JSON) or "never" for a disabled route:'
  );
  const conditionStr = await input('Condition');

  let condition: unknown;
  if (conditionStr.toLowerCase() === 'never') {
    condition = { never: {} };
  } else {
    try {
      condition = JSON.parse(conditionStr);
    } catch {
      formatter.error('Invalid JSON for condition');
      return;
    }
  }

  try {
    await httpClient.postPublic(`/api/streams/${encodeURIComponent(parentName)}/_fork`, {
      stream: { name: childName },
      where: condition,
    });
    formatter.success(`Stream '${childName}' forked from '${parentName}'.`);
  } catch (error: any) {
    formatter.error(error.message);
  }
}

async function handleIngestActions(
  httpClient: HttpClient,
  formatter: Formatter,
  streamName: string
): Promise<void> {
  const action = await select<'view' | 'update' | 'back'>('Ingest settings:', [
    { value: 'view', label: 'View ingest configuration' },
    { value: 'update', label: 'Update ingest configuration' },
    { value: 'back', label: '[Back]' },
  ]);

  if (action === 'back') return;

  try {
    if (action === 'view') {
      const response = await httpClient.getPublic<{ ingest: unknown }>(
        `/api/streams/${encodeURIComponent(streamName)}/_ingest`
      );
      formatter.message(`Ingest configuration for '${streamName}':`);
      formatter.json(response.ingest);
    } else {
      formatter.message('\nTo update ingest settings, use the non-interactive command:');
      formatter.message(`  node scripts/streams_cli ingest-set ${streamName} --file <path>\n`);
    }
  } catch (error: any) {
    formatter.error(error.message);
  }
}

async function handleFeatureActions(
  httpClient: HttpClient,
  formatter: Formatter,
  streamName: string
): Promise<void> {
  while (true) {
    const action = await select<
      'list' | 'add' | 'delete' | 'bulk' | 'identify' | 'back'
    >(`Features for '${streamName}':`, [
      { value: 'list', label: 'List features' },
      { value: 'add', label: 'Add/update feature' },
      { value: 'delete', label: 'Delete feature' },
      { value: 'bulk', label: 'Bulk update features' },
      { value: 'identify', label: 'Feature identification tasks' },
      { value: 'back', label: '[Back]' },
    ]);

    if (action === 'back') return;

    try {
      switch (action) {
        case 'list': {
          const response = await httpClient.getInternal<{
            features: Array<{ id?: string; name?: string }>;
          }>(`/internal/streams/${encodeURIComponent(streamName)}/features`);
          formatter.featureList(response.features);
          break;
        }
        case 'delete': {
          const featureId = await input('Enter feature ID to delete');
          if (!featureId) {
            formatter.message('Feature ID is required.');
            break;
          }
          const confirmed = await confirm(`Delete feature '${featureId}'?`);
          if (confirmed) {
            await httpClient.deleteInternal(
              `/internal/streams/${encodeURIComponent(streamName)}/features/${encodeURIComponent(featureId)}`
            );
            formatter.success('Feature deleted.');
          }
          break;
        }
        case 'identify': {
          await handleFeatureIdentificationTasks(httpClient, formatter, streamName);
          break;
        }
        default:
          formatter.message('\nUse the non-interactive command for this action.');
          formatter.message(`  node scripts/streams_cli features-${action} ${streamName} ...\n`);
      }
    } catch (error: any) {
      formatter.error(error.message);
    }
  }
}

async function handleFeatureIdentificationTasks(
  httpClient: HttpClient,
  formatter: Formatter,
  streamName: string
): Promise<void> {
  const action = await select<'status' | 'schedule' | 'cancel' | 'acknowledge' | 'back'>(
    'Feature identification:',
    [
      { value: 'status', label: 'View task status' },
      { value: 'schedule', label: 'Schedule task' },
      { value: 'cancel', label: 'Cancel task' },
      { value: 'acknowledge', label: 'Acknowledge task' },
      { value: 'back', label: '[Back]' },
    ]
  );

  if (action === 'back') return;

  try {
    if (action === 'status') {
      const response = await httpClient.getInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(streamName)}/features/_status`
      );
      formatter.taskStatus(response);
      return;
    }

    if (action === 'schedule') {
      const from = await input('Start date (ISO format)');
      const to = await input('End date (ISO format)');

      if (!from || !to) {
        formatter.message('Both dates are required.');
        return;
      }

      const response = await httpClient.postInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(streamName)}/features/_task`,
        { action: 'schedule', from, to }
      );
      formatter.taskStatus(response);
    } else {
      const response = await httpClient.postInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(streamName)}/features/_task`,
        { action }
      );
      formatter.taskStatus(response);
    }
  } catch (error: any) {
    formatter.error(error.message);
  }
}

async function handleSignificantEventsActions(
  httpClient: HttpClient,
  formatter: Formatter,
  streamName: string
): Promise<void> {
  while (true) {
    const action = await select<'read' | 'preview' | 'generate' | 'task' | 'back'>(
      `Significant events for '${streamName}':`,
      [
        { value: 'read', label: 'Read significant events' },
        { value: 'preview', label: 'Preview significant events' },
        { value: 'generate', label: 'Generate significant events' },
        { value: 'task', label: 'Manage generation tasks' },
        { value: 'back', label: '[Back]' },
      ]
    );

    if (action === 'back') return;

    try {
      switch (action) {
        case 'read': {
          const from = await input('Start date (ISO format)');
          const to = await input('End date (ISO format)');
          const bucketSize = await input('Bucket size (e.g., 1h)');

          if (!from || !to || !bucketSize) {
            formatter.message('All parameters are required.');
            break;
          }

          const response = await httpClient.getPublic<Record<string, unknown>>(
            `/api/streams/${encodeURIComponent(streamName)}/significant_events`,
            { from, to, bucketSize }
          );
          formatter.json(response);
          break;
        }
        case 'task': {
          await handleSignificantEventsTaskActions(httpClient, formatter, streamName);
          break;
        }
        default:
          formatter.message('\nUse the non-interactive command for this action.');
          formatter.message(
            `  node scripts/streams_cli significant-events-${action} ${streamName} ...\n`
          );
      }
    } catch (error: any) {
      formatter.error(error.message);
    }
  }
}

async function handleSignificantEventsTaskActions(
  httpClient: HttpClient,
  formatter: Formatter,
  streamName: string
): Promise<void> {
  const action = await select<'status' | 'schedule' | 'cancel' | 'acknowledge' | 'back'>(
    'Significant events task:',
    [
      { value: 'status', label: 'View task status' },
      { value: 'schedule', label: 'Schedule task' },
      { value: 'cancel', label: 'Cancel task' },
      { value: 'acknowledge', label: 'Acknowledge task' },
      { value: 'back', label: '[Back]' },
    ]
  );

  if (action === 'back') return;

  try {
    if (action === 'status') {
      const response = await httpClient.getInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(streamName)}/significant_events/_status`
      );
      formatter.taskStatus(response);
      return;
    }

    if (action === 'schedule') {
      const from = await input('Start date (ISO format)');
      const to = await input('End date (ISO format)');

      if (!from || !to) {
        formatter.message('Both dates are required.');
        return;
      }

      const response = await httpClient.postInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(streamName)}/significant_events/_task`,
        { action: 'schedule', from, to }
      );
      formatter.taskStatus(response);
    } else {
      const response = await httpClient.postInternal<Record<string, unknown>>(
        `/internal/streams/${encodeURIComponent(streamName)}/significant_events/_task`,
        { action }
      );
      formatter.taskStatus(response);
    }
  } catch (error: any) {
    formatter.error(error.message);
  }
}
