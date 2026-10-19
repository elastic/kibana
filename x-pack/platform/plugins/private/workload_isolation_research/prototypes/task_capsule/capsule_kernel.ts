/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type {
  ConnectionRequestParams,
  ConnectionRequestOptions,
  ConnectionRequestOptionsAsStream,
  ConnectionRequestResponse,
  ConnectionRequestResponseAsStream,
} from '@elastic/transport';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';

export interface CapsuleProbeResult {
  readonly attributes: { value: string; migrated: boolean };
  readonly typeMigrationVersion?: string;
  readonly transportCalls: number;
  readonly logCount: number;
  readonly setup_and_probe_ms: number;
  readonly heap_used: number;
  readonly heap_before_gc: number;
  readonly forced_gc: boolean;
  readonly gc_ms: number;
  readonly rss: number;
  readonly limitations: readonly string[];
}

/** Probes the real document migrator and SO repository against an explicitly fake ES transport. */
export const runCapsuleProbe = async (
  dependencies: NodeJS.Require
): Promise<CapsuleProbeResult> => {
  const started = performance.now();
  const { Client } = dependencies(
    '@elastic/elasticsearch'
  ) as typeof import('@elastic/elasticsearch');
  const { SavedObjectTypeRegistry } = dependencies(
    '@kbn/core-saved-objects-base-server-internal'
  ) as typeof import('@kbn/core-saved-objects-base-server-internal');
  const { DocumentMigrator, buildActiveMappings, buildTypesMappings } = dependencies(
    '@kbn/core-saved-objects-migration-server-internal'
  ) as typeof import('@kbn/core-saved-objects-migration-server-internal');
  const { SavedObjectsRepository } = dependencies(
    '@kbn/core-saved-objects-api-server-internal'
  ) as typeof import('@kbn/core-saved-objects-api-server-internal');
  const { of } = dependencies('rxjs') as typeof import('rxjs');
  const logMessages: string[] = [];
  const log = (message: string | Error | (() => string)): void => {
    logMessages.push(typeof message === 'function' ? message() : String(message));
  };
  const logger: Logger = {
    trace: log,
    debug: log,
    info: log,
    warn: log,
    error: log,
    fatal: log,
    log: (record) => log(record.message),
    isLevelEnabled: () => true,
    get: () => logger,
  };
  const type = 'task_capsule_fixture';
  const registry = new SavedObjectTypeRegistry();
  registry.registerType({
    name: type,
    hidden: true,
    namespaceType: 'single',
    mappings: { properties: { value: { type: 'keyword' }, migrated: { type: 'boolean' } } },
    modelVersions: {
      1: { changes: [] },
      2: {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (document) => ({
              attributes: { ...document.attributes, migrated: true },
            }),
          },
        ],
      },
    },
  });
  const documentMigrator = new DocumentMigrator({
    kibanaVersion: '9.5.0',
    typeRegistry: registry,
    log: logger,
  });
  documentMigrator.prepareMigrations();
  const mappings = buildActiveMappings(buildTypesMappings(registry.getAllTypes()));
  const migrator: IKibanaMigrator = {
    kibanaVersion: '9.5.0',
    prepareMigrations: () => documentMigrator.prepareMigrations(),
    getActiveMappings: () => mappings,
    getDocumentMigrator: () => documentMigrator,
    migrateDocument: (document, options) => documentMigrator.migrate(document, options),
    // This fixture cannot claim real index-migration readiness or perform startup migration.
    getStatus$: () => of({ status: 'waiting_to_start' as const }),
    runMigrations: async () => {
      throw new Error('Index migrations belong to the control-plane readiness fence');
    },
  };
  let transportCalls = 0;
  const { BaseConnection } = dependencies(
    '@elastic/transport'
  ) as typeof import('@elastic/transport');
  // Replace only the network connection; the real ES client still decodes the response bytes.
  class FixtureConnection extends BaseConnection {
    public override close(): Promise<void> {
      return Promise.resolve();
    }

    public override request(
      params: ConnectionRequestParams,
      options: ConnectionRequestOptions
    ): Promise<ConnectionRequestResponse>;
    public override request(
      params: ConnectionRequestParams,
      options: ConnectionRequestOptionsAsStream
    ): Promise<ConnectionRequestResponseAsStream>;
    public override async request(
      params: ConnectionRequestParams,
      options: ConnectionRequestOptions | ConnectionRequestOptionsAsStream
    ): Promise<ConnectionRequestResponse | ConnectionRequestResponseAsStream> {
      transportCalls++;
      const id = decodeURIComponent(params.path.split('/').at(-1) ?? '');
      const found = id === `space-a:${type}:fixture-id`;
      const body = JSON.stringify({
        _id: id,
        _index: '.kibana_9.5.0_001',
        _seq_no: 1,
        _primary_term: 1,
        found,
        ...(found
          ? {
              _source: {
                type,
                namespace: 'space-a',
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: '10.1.0',
                references: [],
                [type]: { value: 'fixture-value' },
              },
            }
          : {}),
      });
      const metadata = {
        statusCode: found ? 200 : 404,
        headers: { 'x-elastic-product': 'Elasticsearch', 'content-type': 'application/json' },
      };
      if ('asStream' in options && options.asStream) {
        return { ...metadata, body: Readable.from([body]) };
      }
      return { ...metadata, body };
    }
  }
  const client = new Client({
    node: 'http://127.0.0.1:1',
    maxRetries: 0,
    Connection: FixtureConnection,
  });
  try {
    const repository = SavedObjectsRepository.createRepository(
      migrator,
      registry,
      '.kibana',
      client as ElasticsearchClient,
      logger,
      [type]
    );
    const result = await repository.get<{ value: string; migrated: boolean }>(type, 'fixture-id', {
      namespace: 'space-a',
    });
    assert.equal(result.attributes.value, 'fixture-value');
    assert.equal(result.attributes.migrated, true);
    assert.equal(result.typeMigrationVersion, '10.2.0');
    await assert.rejects(
      repository.get(type, 'fixture-id', { namespace: 'space-b' }),
      /not found/i
    );
    await assert.rejects(repository.get('not_registered', 'fixture-id'), /not found/i);
    const setupAndProbeMs = performance.now() - started;
    const heapBeforeGc = process.memoryUsage().heapUsed;
    const forceGc = process.env.WIR_FORCE_GC === '1';
    const gcStarted = performance.now();
    if (forceGc) {
      assert.ok(global.gc, 'Use node --expose-gc for the retained-heap measurement');
      global.gc();
    }
    const gcMs = forceGc ? performance.now() - gcStarted : 0;
    return {
      attributes: result.attributes,
      typeMigrationVersion: result.typeMigrationVersion,
      transportCalls,
      logCount: logMessages.length,
      setup_and_probe_ms: setupAndProbeMs,
      heap_used: process.memoryUsage().heapUsed,
      heap_before_gc: heapBeforeGc,
      forced_gc: forceGc,
      gc_ms: gcMs,
      rss: process.memoryUsage().rss,
      limitations: [
        'fake_ES_get_only',
        'no_security_spaces_encryption_extensions',
        'no_index_readiness_proof',
      ],
    };
  } finally {
    await client.close();
  }
};
