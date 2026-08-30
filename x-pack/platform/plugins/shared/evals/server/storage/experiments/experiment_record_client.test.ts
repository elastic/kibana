/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { InternalIStorageClient } from '@kbn/storage-adapter';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { getExperimentRecordId } from '@kbn/evals-common';
import { ExperimentRecordAlreadyExistsError } from './experiment_record_already_exists_error';
import { ExperimentRecordNotFoundError } from './experiment_record_not_found_error';
import type { ExperimentsStorageAdapter } from './experiment_record_client';
import { ExperimentRecordClient } from './experiment_record_client';
import type {
  ExperimentProtocolSnapshot,
  ExperimentRecordStorageProperties,
} from './experiments_storage';

type ExperimentRecordStorageDocument = ExperimentRecordStorageProperties & { _id?: string };
type MockQuery = Record<string, any>;

interface MockEntry {
  document: ExperimentRecordStorageDocument;
  seqNo: number;
  primaryTerm: number;
}

const PROTOCOL: ExperimentProtocolSnapshot = {
  dataset: { id: 'dataset-1', name: 'Q&A regression set', examples_count: 12 },
  task: { model: { id: 'gpt-x', family: 'gpt', provider: 'openai' } },
  evaluators: [
    { name: 'correctness', version: '1.0.0', kind: 'llm', model: { id: 'judge-model' } },
    { name: 'latency', kind: 'code' },
  ],
  total_repetitions: 2,
};

const matchesQuery = (
  id: string,
  document: ExperimentRecordStorageDocument,
  query: MockQuery | undefined
): boolean => {
  if (!query || query.match_all) {
    return true;
  }

  if (query.term) {
    const [[field, value]] = Object.entries(query.term) as Array<[string, string]>;
    if (field === '_id') {
      return id === value;
    }
    return (document as unknown as Record<string, unknown>)[field] === value;
  }

  if (query.terms) {
    const [[field, values]] = Object.entries(query.terms) as Array<[string, string[]]>;
    const actual = (document as unknown as Record<string, unknown>)[field];
    if (Array.isArray(actual)) {
      return actual.some((entry) => typeof entry === 'string' && values.includes(entry));
    }
    return typeof actual === 'string' && values.includes(actual);
  }

  if (query.exists) {
    return (
      (document as unknown as Record<string, unknown>)[query.exists.field as string] !== undefined
    );
  }

  if (query.bool) {
    const asClauses = (clauses: MockQuery | MockQuery[] | undefined): MockQuery[] =>
      clauses === undefined ? [] : Array.isArray(clauses) ? clauses : [clauses];

    const must = asClauses(query.bool.must);
    const filter = asClauses(query.bool.filter);
    const should = asClauses(query.bool.should);
    const mustNot = asClauses(query.bool.must_not);

    return (
      [...must, ...filter].every((clause) => matchesQuery(id, document, clause)) &&
      mustNot.every((clause) => !matchesQuery(id, document, clause)) &&
      (should.length === 0 || should.some((clause) => matchesQuery(id, document, clause)))
    );
  }

  throw new Error(`Unsupported mock query clause: ${JSON.stringify(query)}`);
};

const conflict = () =>
  new errors.ResponseError({
    statusCode: 409,
    body: {},
    headers: {},
    warnings: [],
    meta: {} as any,
  });

const createStorageAdapter = () => {
  const docs = new Map<string, MockEntry>();
  let nextSeqNo = 0;

  const search = jest.fn(async (params: Record<string, unknown>) => {
    const rows = [...docs.entries()]
      .filter(([id, entry]) =>
        matchesQuery(id, entry.document, params.query as MockQuery | undefined)
      )
      .map(([id, entry]) => ({
        _id: id,
        _source: entry.document,
        ...(params.seq_no_primary_term
          ? { _seq_no: entry.seqNo, _primary_term: entry.primaryTerm }
          : {}),
      }));
    const size = (params.size as number | undefined) ?? rows.length;

    return { hits: { hits: rows.slice(0, size), total: { value: rows.length } } };
  });

  const index = jest.fn(
    async ({
      id,
      op_type: opType,
      document,
      if_seq_no: ifSeqNo,
      if_primary_term: ifPrimaryTerm,
    }: Record<string, unknown>) => {
      const docId = id as string;
      const existing = docs.get(docId);
      if (opType === 'create' && existing) {
        throw conflict();
      }
      if (
        ifSeqNo != null &&
        ifPrimaryTerm != null &&
        (existing?.seqNo !== ifSeqNo || existing?.primaryTerm !== ifPrimaryTerm)
      ) {
        throw conflict();
      }

      const entry: MockEntry = {
        document: document as ExperimentRecordStorageDocument,
        seqNo: nextSeqNo++,
        primaryTerm: 1,
      };
      docs.set(docId, entry);
      return { result: 'created', _seq_no: entry.seqNo, _primary_term: entry.primaryTerm };
    }
  );

  const client = {
    search,
    index,
  } as unknown as InternalIStorageClient<ExperimentRecordStorageDocument>;

  return {
    docs,
    search,
    index,
    adapter: { getClient: () => client } as unknown as ExperimentsStorageAdapter,
  };
};

const createClient = ({ spaceId = DEFAULT_SPACE_ID }: { spaceId?: string } = {}) => {
  const storage = createStorageAdapter();
  const logger = { debug: jest.fn(), error: jest.fn(), warn: jest.fn() } as unknown as Logger;

  return {
    ...storage,
    logger,
    client: new ExperimentRecordClient({
      storageAdapter: storage.adapter,
      logger,
      spaceId,
    }),
  };
};

describe('ExperimentRecordClient', () => {
  describe('create', () => {
    it('writes the record at the id derived from the space and experiment', async () => {
      const { client, docs } = createClient();

      const created = await client.create({
        experimentId: 'exp-1',
        name: 'My experiment',
        protocol: PROTOCOL,
      });

      expect(created).toEqual(
        expect.objectContaining({
          id: getExperimentRecordId(DEFAULT_SPACE_ID, 'exp-1'),
          experiment_id: 'exp-1',
          name: 'My experiment',
          protocol: PROTOCOL,
          status: 'running',
          space_ids: [DEFAULT_SPACE_ID],
        })
      );
      expect(docs.get(created.id)?.document).toEqual(
        expect.objectContaining({ experiment_id: 'exp-1', status: 'running' })
      );
    });

    it('stamps started_at for a running record but not a pending one', async () => {
      const { client } = createClient();

      const running = await client.create({
        experimentId: 'exp-running',
        name: 'Running',
        protocol: PROTOCOL,
      });
      const pending = await client.create({
        experimentId: 'exp-pending',
        name: 'Pending',
        protocol: PROTOCOL,
        status: 'pending',
      });

      expect(running.started_at).toBeDefined();
      expect(running.started_at).toBe(running.created_at);
      expect(pending.status).toBe('pending');
      expect(pending.started_at).toBeUndefined();
      expect(pending.completed_at).toBeUndefined();
    });

    it('keeps the description and provenance the producer supplied', async () => {
      const { client } = createClient();

      const created = await client.create({
        experimentId: 'exp-1',
        name: 'My experiment',
        description: 'Nightly regression run',
        protocol: PROTOCOL,
        provenance: {
          execution_id: 'run-1',
          hostname: 'ci-worker-3',
          git: { branch: 'main', commit_sha: 'abc123' },
        },
        startedAt: '2026-01-01T00:00:00.000Z',
      });

      expect(created.description).toBe('Nightly regression run');
      expect(created.provenance).toEqual(
        expect.objectContaining({ execution_id: 'run-1', hostname: 'ci-worker-3' })
      );
      expect(created.started_at).toBe('2026-01-01T00:00:00.000Z');
    });

    it('assigns the record to the client space', async () => {
      const { client, docs } = createClient({ spaceId: 'marketing' });

      const created = await client.create({
        experimentId: 'exp-1',
        name: 'My experiment',
        protocol: PROTOCOL,
      });

      expect(docs.get(created.id)?.document.space_ids).toEqual(['marketing']);
    });

    it('always keeps its own space among explicitly assigned spaces', async () => {
      const { client, docs } = createClient({ spaceId: 'marketing' });

      const created = await client.create({
        experimentId: 'exp-1',
        name: 'My experiment',
        protocol: PROTOCOL,
        spaceIds: ['sales', 'marketing', 'ops'],
      });

      // The creating space comes first and duplicates collapse, so the record
      // stays readable and finalizable from the space that created it.
      expect(docs.get(created.id)?.document.space_ids).toEqual(['marketing', 'sales', 'ops']);
    });

    it('rejects a second record for the same experiment', async () => {
      const { client } = createClient();
      await client.create({ experimentId: 'exp-1', name: 'First', protocol: PROTOCOL });

      await expect(
        client.create({ experimentId: 'exp-1', name: 'Second', protocol: PROTOCOL })
      ).rejects.toThrow(ExperimentRecordAlreadyExistsError);
    });
  });

  describe('get', () => {
    it('returns the record for an experiment id', async () => {
      const { client } = createClient();
      await client.create({ experimentId: 'exp-1', name: 'My experiment', protocol: PROTOCOL });

      await expect(client.get('exp-1')).resolves.toEqual(
        expect.objectContaining({ experiment_id: 'exp-1', name: 'My experiment' })
      );
    });

    it('returns undefined for an experiment that was never recorded', async () => {
      const { client } = createClient();

      await expect(client.get('exp-unknown')).resolves.toBeUndefined();
    });

    it('hides records belonging to another space', async () => {
      const storage = createStorageAdapter();
      const logger = { debug: jest.fn() } as unknown as Logger;
      const marketing = new ExperimentRecordClient({
        storageAdapter: storage.adapter,
        logger,
        spaceId: 'marketing',
      });
      const support = new ExperimentRecordClient({
        storageAdapter: storage.adapter,
        logger,
        spaceId: 'support',
      });

      await marketing.create({ experimentId: 'exp-1', name: 'Marketing', protocol: PROTOCOL });

      await expect(support.get('exp-1')).resolves.toBeUndefined();
      await expect(marketing.get('exp-1')).resolves.toBeDefined();
    });

    it('lets the same experiment id exist independently in two spaces', async () => {
      const storage = createStorageAdapter();
      const logger = { debug: jest.fn() } as unknown as Logger;
      const marketing = new ExperimentRecordClient({
        storageAdapter: storage.adapter,
        logger,
        spaceId: 'marketing',
      });
      const support = new ExperimentRecordClient({
        storageAdapter: storage.adapter,
        logger,
        spaceId: 'support',
      });

      await marketing.create({ experimentId: 'exp-1', name: 'Marketing', protocol: PROTOCOL });
      await support.create({ experimentId: 'exp-1', name: 'Support', protocol: PROTOCOL });

      await expect(marketing.get('exp-1')).resolves.toEqual(
        expect.objectContaining({ name: 'Marketing' })
      );
      await expect(support.get('exp-1')).resolves.toEqual(
        expect.objectContaining({ name: 'Support' })
      );
    });
  });

  describe('update', () => {
    it('finalizes a running record with completeness counters', async () => {
      const { client } = createClient();
      await client.create({ experimentId: 'exp-1', name: 'My experiment', protocol: PROTOCOL });

      const updated = await client.update('exp-1', {
        status: 'completed',
        completeness: { successful_tasks: 24, failed_tasks: 0, score_ingest_failures: 0 },
      });

      expect(updated.status).toBe('completed');
      expect(updated.completed_at).toBeDefined();
      expect(updated.completeness).toEqual({
        successful_tasks: 24,
        failed_tasks: 0,
        score_ingest_failures: 0,
      });
      // The protocol snapshot is carried forward untouched.
      expect(updated.protocol).toEqual(PROTOCOL);
    });

    it('records the failure reason of a failed run', async () => {
      const { client } = createClient();
      await client.create({ experimentId: 'exp-1', name: 'My experiment', protocol: PROTOCOL });

      const updated = await client.update('exp-1', {
        status: 'failed',
        error: 'Task provider timed out',
      });

      expect(updated.status).toBe('failed');
      expect(updated.error).toBe('Task provider timed out');
      expect(updated.completed_at).toBeDefined();
    });

    it('stamps started_at when a pending record starts running', async () => {
      const { client } = createClient();
      await client.create({
        experimentId: 'exp-1',
        name: 'Queued run',
        protocol: PROTOCOL,
        status: 'pending',
      });

      const updated = await client.update('exp-1', { status: 'running' });

      expect(updated.status).toBe('running');
      expect(updated.started_at).toBeDefined();
      expect(updated.completed_at).toBeUndefined();
    });

    it('does not stamp started_at when a pending record fails before running', async () => {
      const { client } = createClient();
      await client.create({
        experimentId: 'exp-1',
        name: 'Queued run',
        protocol: PROTOCOL,
        status: 'pending',
      });

      const updated = await client.update('exp-1', { status: 'failed', error: 'provision error' });

      expect(updated.status).toBe('failed');
      expect(updated.started_at).toBeUndefined();
      expect(updated.completed_at).toBeDefined();
    });

    it('surfaces the original error when the recovery read in the catch block also throws', async () => {
      const { client, search, index } = createClient();
      await client.create({ experimentId: 'exp-1', name: 'My experiment', protocol: PROTOCOL });

      const originalError = new Error('original write error');
      index.mockRejectedValueOnce(originalError);

      const realImpl = search.getMockImplementation()!;
      search
        .mockImplementationOnce(realImpl) // pre-check
        .mockImplementationOnce(realImpl) // OccWriter get
        .mockRejectedValueOnce(new Error('secondary read error')); // recovery

      await expect(client.update('exp-1', { status: 'completed' })).rejects.toThrow(
        'original write error'
      );
    });

    it('prefers the caller-supplied completion time over its own clock', async () => {
      const { client } = createClient();
      await client.create({ experimentId: 'exp-1', name: 'My experiment', protocol: PROTOCOL });

      const updated = await client.update('exp-1', {
        status: 'completed',
        completedAt: '2026-01-02T03:04:05.000Z',
      });

      expect(updated.completed_at).toBe('2026-01-02T03:04:05.000Z');
    });

    it('rejects an update to an experiment that was never recorded', async () => {
      const { client } = createClient();

      await expect(client.update('exp-unknown', { status: 'completed' })).rejects.toThrow(
        ExperimentRecordNotFoundError
      );
    });

    it('re-reads and retries when a concurrent write lands in between', async () => {
      const { client, docs, index } = createClient();
      const created = await client.create({
        experimentId: 'exp-1',
        name: 'My experiment',
        protocol: PROTOCOL,
      });

      // A racing update bumps the stored seq_no between this call's read and
      // its write, so the conditional write conflicts and the retry re-reads.
      index.mockImplementationOnce(async () => {
        const entry = docs.get(created.id)!;
        docs.set(created.id, {
          ...entry,
          document: { ...entry.document, status: 'running', error: 'transient hiccup' },
          seqNo: entry.seqNo + 1,
        });
        throw conflict();
      });

      const updated = await client.update('exp-1', { status: 'completed' });

      expect(updated.status).toBe('completed');
      // The retry carried forward what the racing write stored, not what the
      // first attempt had read.
      expect(updated.error).toBe('transient hiccup');
    });

    it('hides records belonging to another space from updates', async () => {
      const storage = createStorageAdapter();
      const logger = { debug: jest.fn() } as unknown as Logger;
      const marketing = new ExperimentRecordClient({
        storageAdapter: storage.adapter,
        logger,
        spaceId: 'marketing',
      });
      const support = new ExperimentRecordClient({
        storageAdapter: storage.adapter,
        logger,
        spaceId: 'support',
      });
      await marketing.create({ experimentId: 'exp-1', name: 'Marketing', protocol: PROTOCOL });

      await expect(support.update('exp-1', { status: 'completed' })).rejects.toThrow(
        ExperimentRecordNotFoundError
      );
      await expect(marketing.get('exp-1')).resolves.toEqual(
        expect.objectContaining({ status: 'running' })
      );
    });
  });
});
