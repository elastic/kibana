/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import inquirer from 'inquirer';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { isNotFoundError } from '@kbn/es-errors';
import { createEsClientForTesting } from '@kbn/test';
import { envFromExportProfile, defaultExportProfile } from '../profiles';
import { isTTY } from '../prompts';

const DEFAULT_PATTERN = 'kibana-evaluations*';
const DEFAULT_DATA_STREAM = 'kibana-evaluations';
const DEFAULT_TEMPLATE = 'kibana-evaluations-template';

const parseEsUrl = (esUrl: string): URL => {
  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(esUrl) ? esUrl : `http://${esUrl}`;
  return new URL(withProtocol);
};

const isElasticCloudEsUrl = (esUrl: string): boolean => {
  try {
    const hostname = parseEsUrl(esUrl).hostname.replace(/\.$/, '').toLowerCase();
    return (
      hostname === 'elastic-cloud.com' ||
      hostname.endsWith('.elastic-cloud.com') ||
      hostname.endsWith('elastic.cloud')
    );
  } catch {
    return false;
  }
};

export const clearIndexCmd: Command<void> = {
  name: 'clear-index',
  description: `
  Clear evaluation indices from an Elasticsearch cluster (useful for resetting local export data).

  Safety:
    - By default this command only runs against localhost/127.0.0.1.
    - It always prompts for confirmation unless --force is used.

  By default, this deletes:
    - data stream:   ${DEFAULT_DATA_STREAM}   (if it exists)
    - indices:       ${DEFAULT_PATTERN}

  Examples:
    node scripts/evals clear-index
    node scripts/evals clear-index --export-profile local
    node scripts/evals clear-index --pattern kibana-evaluations* --force
    node scripts/evals clear-index --es-url http://elastic:changeme@localhost:9201 --force
  `,
  flags: {
    string: [
      'profile',
      'export-profile',
      'pattern',
      'data-stream',
      'template',
      'es-url',
      'es-api-key',
    ],
    boolean: ['force', 'dry-run', 'delete-template', 'allow-remote'],
    default: { force: false, 'delete-template': false, 'dry-run': false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();

    const baseProfile = flagsReader.string('profile') ?? undefined;
    const exportProfile =
      flagsReader.string('export-profile') ?? baseProfile ?? defaultExportProfile(repoRoot);

    const exportEnv = envFromExportProfile(repoRoot, exportProfile);

    const esUrl =
      flagsReader.string('es-url') ??
      exportEnv.EVALUATIONS_ES_URL ??
      process.env.EVALUATIONS_ES_URL;
    if (!esUrl) {
      throw createFlagError(
        [
          'No Elasticsearch URL configured for clearing indices.',
          'Provide --es-url, set EVALUATIONS_ES_URL, or use --export-profile <name> with a config.<name>.json file.',
        ].join('\n')
      );
    }

    const esApiKey =
      flagsReader.string('es-api-key') ??
      exportEnv.EVALUATIONS_ES_API_KEY ??
      process.env.EVALUATIONS_ES_API_KEY;

    const pattern = flagsReader.string('pattern') ?? DEFAULT_PATTERN;
    const dataStream = flagsReader.string('data-stream') ?? DEFAULT_DATA_STREAM;
    const template = flagsReader.string('template') ?? DEFAULT_TEMPLATE;
    const deleteTemplate = flagsReader.boolean('delete-template');
    const dryRun = flagsReader.boolean('dry-run');

    const force = flagsReader.boolean('force');
    const allowRemote = flagsReader.boolean('allow-remote');

    let parsedEsUrl: URL;
    try {
      parsedEsUrl = parseEsUrl(esUrl);
    } catch {
      throw createFlagError(`Invalid --es-url value: ${esUrl}`);
    }

    const targetHost = parsedEsUrl.hostname.replace(/\.$/, '').toLowerCase();
    const isLoopback = targetHost === 'localhost' || targetHost === '127.0.0.1';
    const isCloud = isElasticCloudEsUrl(esUrl);

    if (isCloud && !allowRemote) {
      throw createFlagError(
        [
          `Refusing to clear indices on an Elastic Cloud URL (${targetHost}) without --allow-remote.`,
          'This is intentionally hard to do to prevent accidentally wiping shared clusters.',
        ].join('\n')
      );
    }

    if (!isLoopback && !allowRemote) {
      throw createFlagError(
        [
          `Refusing to clear indices on non-local Elasticsearch host (${targetHost}) without --allow-remote.`,
          'If you really intend to do this, pass --allow-remote and re-run (you will be prompted to confirm).',
        ].join('\n')
      );
    }

    const shouldPrompt = isTTY() && (!force || allowRemote);
    if (shouldPrompt) {
      const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>({
        type: 'confirm',
        name: 'confirmed',
        message:
          `This will delete Elasticsearch data from:\n` +
          `  - ES:          ${esUrl}\n` +
          `  - data stream: ${dataStream}\n` +
          `  - indices:     ${pattern}\n` +
          (deleteTemplate ? `  - template:    ${template}\n` : '') +
          `\nContinue?`,
        default: false,
      });

      if (!confirmed) {
        log.info('Aborted.');
        return;
      }
    } else if (!force && !isTTY()) {
      throw createFlagError('Refusing to delete indices without --force in non-interactive mode.');
    }

    // Extra friction: for remote targets, require an explicit typed confirmation even if --force is present.
    if (!isLoopback) {
      if (!isTTY()) {
        throw createFlagError(
          'Refusing to clear indices on a remote host in non-interactive mode. Run in a TTY.'
        );
      }

      const { typed } = await inquirer.prompt<{ typed: string }>({
        type: 'input',
        name: 'typed',
        message: `Type the Elasticsearch host to confirm deletion: ${targetHost}`,
      });

      if (typed.trim().toLowerCase() !== targetHost) {
        throw createFlagError('Confirmation did not match. Aborting.');
      }
    }

    const esClient = createEsClientForTesting({
      esUrl,
      isCloud: isElasticCloudEsUrl(esUrl),
      ...(esApiKey ? { auth: { apiKey: esApiKey } } : {}),
    });

    log.info('');
    log.info(`Target Elasticsearch: ${esUrl}`);
    log.info(`Deleting data stream: ${dataStream}`);
    log.info(`Deleting indices: ${pattern}`);
    if (deleteTemplate) {
      log.info(`Deleting index template: ${template}`);
    }
    log.info('');

    if (dryRun) {
      log.info('Dry run -- exiting.');
      return;
    }

    // Delete data stream first (if present), then indices.
    try {
      await esClient.indices.deleteDataStream({ name: dataStream });
      log.info(`Deleted data stream: ${dataStream}`);
    } catch (error: unknown) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    // Some clusters enforce `action.destructive_requires_name`, which forbids wildcards in deletes.
    // Resolve concrete index names first, then delete them explicitly.
    let matchedIndexNames: string[] = [];
    try {
      const resolved = await esClient.indices.get({
        index: pattern,
        allow_no_indices: true,
        ignore_unavailable: true,
        expand_wildcards: ['open', 'closed', 'hidden'],
      });
      matchedIndexNames = Object.keys(resolved ?? {});
    } catch (error: unknown) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    if (matchedIndexNames.length === 0) {
      log.info(`No indices matched: ${pattern}`);
    } else {
      for (const index of matchedIndexNames) {
        await esClient.indices.delete({ index, ignore_unavailable: true });
      }
      log.info(`Deleted ${matchedIndexNames.length} index/indices matching: ${pattern}`);
    }

    if (deleteTemplate) {
      try {
        await esClient.indices.deleteIndexTemplate({ name: template });
        log.info(`Deleted index template: ${template}`);
      } catch (error: unknown) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }
  },
};
