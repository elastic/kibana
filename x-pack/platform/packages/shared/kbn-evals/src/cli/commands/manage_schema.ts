/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { createEsClientForTesting } from '@kbn/test';
import { EvaluationScoreRepository } from '../../utils/score_repository';

async function isLatestBackingIndexCompatible(esClient: any): Promise<boolean> {
  const ds: any = await esClient.indices.getDataStream({ name: 'kibana-evaluations' });
  const latestIndex = ds?.data_streams?.[0]?.indices?.slice(-1)?.[0]?.index_name;
  if (!latestIndex) return false;

  const mapping: any = await esClient.indices.getMapping({ index: latestIndex });
  const m = mapping?.[latestIndex]?.mappings?.properties;
  return (
    m?.example?.properties?.input?.enabled === false &&
    m?.task?.properties?.output?.enabled === false
  );
}

function normalizeSchemaVersion(version: unknown): number | undefined {
  if (version == null) return undefined;
  const n = Number(version);
  return Number.isFinite(n) ? n : undefined;
}

function isForbidden(error: any): boolean {
  const statusCode = error?.statusCode ?? error?.meta?.statusCode ?? error?.body?.status;
  return statusCode === 403;
}

export const manageSchemaCmd: Command<void> = {
  name: 'manage-schema',
  description: `
  Manage the schema (index template + data stream) used for exporting evaluation results to Elasticsearch.

  This command is intended for operators and scheduled pipelines (e.g. weekly) that are allowed to update
  the golden cluster schema and roll over the data stream when necessary.

  Examples:
    # Ensure the template + data stream exist (and are up to date)
    node scripts/evals manage-schema --evaluations-es-url https://... --evaluations-es-api-key ...

    # Ensure schema and roll over only if the schema version changed
    node scripts/evals manage-schema --rollover-if-needed
  `,
  flags: {
    boolean: ['rollover', 'rollover-if-needed'],
    string: ['evaluations-es-url', 'evaluations-es-api-key'],
    help: `
      --evaluations-es-url           Elasticsearch URL for the golden evaluations cluster (defaults to EVALUATIONS_ES_URL)
      --evaluations-es-api-key       Elasticsearch API key for the golden evaluations cluster (defaults to EVALUATIONS_ES_API_KEY)
      --rollover                     Force rollover of the kibana-evaluations data stream
      --rollover-if-needed           Roll over only if the schema version changed
    `,
  },
  run: async ({ log, flagsReader }) => {
    const evaluationsEsUrl =
      flagsReader.string('evaluations-es-url') ?? process.env.EVALUATIONS_ES_URL ?? '';
    const evaluationsEsApiKey =
      flagsReader.string('evaluations-es-api-key') ?? process.env.EVALUATIONS_ES_API_KEY;

    if (!evaluationsEsUrl) {
      throw createFlagError(
        'Missing evaluations Elasticsearch URL. Set EVALUATIONS_ES_URL or pass --evaluations-es-url.'
      );
    }

    const rollover = flagsReader.boolean('rollover');
    const rolloverIfNeeded = flagsReader.boolean('rollover-if-needed');
    if (rollover && rolloverIfNeeded) {
      throw createFlagError('Use only one of --rollover or --rollover-if-needed.');
    }

    const esClient = createEsClientForTesting({
      esUrl: evaluationsEsUrl,
      ...(evaluationsEsApiKey ? { auth: { apiKey: evaluationsEsApiKey } } : {}),
    });

    // Read current schema version (best effort) before updating.
    let previousSchemaVersion: unknown;
    try {
      const t: any = await esClient.indices.getIndexTemplate({
        name: 'kibana-evaluations-template',
      });
      previousSchemaVersion =
        t?.index_templates?.[0]?.index_template?.template?.mappings?._meta?.kbn_evals
          ?.schema_version;
    } catch {
      previousSchemaVersion = undefined;
    }

    const repo = new EvaluationScoreRepository(esClient as any, log as any);

    let didManageSchema = false;

    // Attempt schema management, but fall back to validate-only when running with a writer key.
    process.env.KBN_EVALS_MANAGE_EVALUATIONS_SCHEMA = 'true';
    try {
      log.info('Ensuring evaluations index template and data stream (manage mode)');
      await repo.preflightExport('schema-manager');
      didManageSchema = true;
    } catch (error: any) {
      if (!isForbidden(error)) {
        throw error;
      }
      log.warning(
        'Schema management is not permitted with the current Elasticsearch credentials (403). Falling back to validate-only.'
      );
      delete process.env.KBN_EVALS_MANAGE_EVALUATIONS_SCHEMA;
      await repo.preflightExport('schema-manager');
    }

    if (rollover || rolloverIfNeeded) {
      if (!didManageSchema) {
        log.warning(
          'Rollover requested but schema management is not permitted; skipping rollover.'
        );
        log.info('✅ Schema validation completed');
        return;
      }

      // Determine if schema version changed post-update.
      const t: any = await esClient.indices.getIndexTemplate({
        name: 'kibana-evaluations-template',
      });
      const currentSchemaVersion =
        t?.index_templates?.[0]?.index_template?.template?.mappings?._meta?.kbn_evals
          ?.schema_version;

      const latestCompatible = await isLatestBackingIndexCompatible(esClient);
      const prevNormalized = normalizeSchemaVersion(previousSchemaVersion);
      const curNormalized = normalizeSchemaVersion(currentSchemaVersion);
      const schemaChanged =
        prevNormalized !== curNormalized &&
        // Backward-compat: v1 clusters may not have schema_version set yet.
        !(prevNormalized == null && curNormalized === 1);
      const shouldRollover = rollover || (rolloverIfNeeded && (!latestCompatible || schemaChanged));

      if (shouldRollover) {
        log.info('Rolling over kibana-evaluations data stream');
        await esClient.indices.rollover({ alias: 'kibana-evaluations' } as any);
      } else {
        log.info('Schema version unchanged; skipping rollover');
      }
    }

    log.info('✅ Schema management completed');
  },
};
