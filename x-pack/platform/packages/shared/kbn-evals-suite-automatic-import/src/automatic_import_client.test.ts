/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { AnalyzeParams } from './automatic_import_client';
import { AutomaticImportClient } from './automatic_import_client';
import type { AutomaticImportRunOutput } from './types';

const PARAMS: AnalyzeParams = {
  integrationId: 'vendor_a_1a2b3c4d',
  dataStreamId: 'signon',
  title: 'Vendor A',
  description: 'Sign-on logs',
  lines: ['line one', 'line two'],
  connectorId: 'connector',
};
const INTEGRATION_PATH = `/api/automatic_import/integrations/${PARAMS.integrationId}`;
const PROCESSORS = [{ set: { field: 'event.kind', value: 'event' } }];
const ON_FAILURE = [{ set: { field: 'error.message', value: 'failed' } }];

/** Elasticsearch returns `null` for a document the pipeline drops, which the client types leave out. */
type Docs = Array<estypes.IngestSimulateDocumentResult | null>;

const parsedDocs: Docs = PARAMS.lines.map((line) => ({
  doc: { _id: '1', _index: 'index', _ingest: { timestamp: 'now' }, _source: { message: line } },
}));

interface FakeStack {
  /** Statuses the analysis reports, one per check; the last one repeats. `unreachable` fails the check. */
  readonly statuses?: readonly string[];
  readonly docs?: Docs;
  readonly traceLookups?: ReadonlyArray<(() => never) | unknown[][]>;
  readonly failUpload?: boolean;
}

const createClient = ({
  statuses = ['completed'],
  docs = parsedDocs,
  traceLookups = [[['trace-1']]],
  failUpload = false,
}: FakeStack = {}) => {
  const remainingStatuses = [...statuses];
  const fetch = jest.fn(async (path: string, options?: Record<string, unknown>) => {
    const method = options?.method;
    if (method === 'POST' && path.endsWith('/upload') && failUpload) {
      throw new Error('Request failed with status 500');
    }
    if (method === 'GET' && path === INTEGRATION_PATH) {
      const status =
        remainingStatuses.length > 1 ? remainingStatuses.shift() : remainingStatuses[0];
      if (status === 'unreachable') {
        throw new Error('socket hang up');
      }
      return {
        integrationResponse: { dataStreams: [{ dataStreamId: PARAMS.dataStreamId, status }] },
      };
    }
    if (method === 'GET' && path.endsWith('/results')) {
      return {
        ingest_pipeline: {
          name: 'logs-vendor_a.signon',
          processors: PROCESSORS,
          on_failure: ON_FAILURE,
        },
      };
    }
    return {};
  });
  const simulate = jest.fn(async () => ({ docs }));
  const remainingLookups = [...traceLookups];
  const query = jest.fn(async () => {
    const lookup = remainingLookups.length > 1 ? remainingLookups.shift() : remainingLookups[0];
    return { values: typeof lookup === 'function' ? lookup() : lookup };
  });

  const client = new AutomaticImportClient(
    fetch,
    { ingest: { simulate } } as unknown as Client,
    { esql: { query } } as unknown as Client,
    new ToolingLog()
  );
  const analyze = async (): Promise<AutomaticImportRunOutput> => {
    const pending = client.analyze(PARAMS);
    await jest.runAllTimersAsync();
    return pending;
  };
  const callsTo = (method: string, path: string) =>
    fetch.mock.calls.filter(([calledPath, options]) => {
      return calledPath === path && options?.method === method;
    }).length;
  const deletedBeforeTraceLookup = () => {
    const deleteCall = fetch.mock.calls.findIndex(([calledPath, options]) => {
      return calledPath === INTEGRATION_PATH && options?.method === 'DELETE';
    });
    const [firstTraceLookup] = query.mock.invocationCallOrder;
    return deleteCall !== -1 && fetch.mock.invocationCallOrder[deleteCall] < firstTraceLookup;
  };

  return { analyze, callsTo, deletedBeforeTraceLookup, simulate, query };
};

describe('AutomaticImportClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for the analysis, re-simulates its pipeline on every line, and deletes the integration', async () => {
    const { analyze, callsTo, simulate } = createClient({
      statuses: ['pending', 'unreachable', 'processing', 'completed'],
    });

    const output = await analyze();

    expect(output).toEqual({
      runId: PARAMS.integrationId,
      status: 'completed',
      lines: PARAMS.lines.map((line) => ({ doc: { message: line } })),
      traceId: 'trace-1',
    });
    expect(callsTo('GET', INTEGRATION_PATH)).toBe(4);
    expect(simulate).toHaveBeenCalledWith({
      pipeline: { processors: PROCESSORS, on_failure: ON_FAILURE },
      docs: PARAMS.lines.map((line) => ({ _source: { message: line } })),
    });
    expect(callsTo('DELETE', INTEGRATION_PATH)).toBe(1);
  });

  it.each(['failed', 'cancelled'])(
    'fails the run at the first %s status, without waiting for a retry',
    async (status) => {
      const { analyze, callsTo, deletedBeforeTraceLookup, simulate } = createClient({
        statuses: ['processing', status],
      });

      const output = await analyze();

      expect(output).toMatchObject({
        runId: PARAMS.integrationId,
        status: 'failed',
        error: `Analysis ${status}`,
        lines: [],
      });
      expect(callsTo('GET', INTEGRATION_PATH)).toBe(2);
      expect(simulate).not.toHaveBeenCalled();
      expect(callsTo('DELETE', INTEGRATION_PATH)).toBe(1);
      expect(deletedBeforeTraceLookup()).toBe(true);
    }
  );

  it('fails the run when the analysis status never changes', async () => {
    const { analyze, callsTo } = createClient({ statuses: ['processing'] });

    const output = await analyze();

    expect(output).toMatchObject({
      status: 'failed',
      error: 'Analysis did not finish within 35 minutes',
    });
    expect(callsTo('DELETE', INTEGRATION_PATH)).toBe(1);
  });

  it('fails the run and still deletes the integration when a request fails', async () => {
    const { analyze, callsTo, deletedBeforeTraceLookup } = createClient({ failUpload: true });

    const output = await analyze();

    expect(output).toMatchObject({ status: 'failed', error: 'Request failed with status 500' });
    expect(callsTo('DELETE', INTEGRATION_PATH)).toBe(1);
    expect(deletedBeforeTraceLookup()).toBe(true);
  });

  it('reports each line the pipeline dropped or failed to parse as an error', async () => {
    const [parsed] = parsedDocs;
    const { analyze } = createClient({
      docs: [
        null,
        { error: { type: 'illegal_argument_exception', reason: 'field [x] not present' } },
        { error: { type: 'script_exception' } },
        {
          doc: {
            _id: '1',
            _index: 'index',
            _ingest: { timestamp: 'now' },
            _source: { error: { message: 'grok failed' } },
          },
        },
        parsed,
      ],
    });

    const { lines } = await analyze();

    expect(lines).toEqual([
      { error: 'Document was dropped by the pipeline' },
      { error: 'field [x] not present' },
      { error: 'script_exception' },
      { error: JSON.stringify({ message: 'grok failed' }) },
      { doc: { message: 'line one' } },
    ]);
  });

  it('keeps looking for the trace until its spans are indexed', async () => {
    const { analyze, query } = createClient({
      traceLookups: [
        () => {
          throw new Error('Unknown column [attributes.automatic_import.integration_id]');
        },
        [],
        [['trace-1']],
      ],
    });

    const { traceId } = await analyze();

    expect(traceId).toBe('trace-1');
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('leaves the trace out when it is never indexed', async () => {
    const { analyze, query } = createClient({ traceLookups: [[]] });

    const output = await analyze();

    expect(output).toMatchObject({ status: 'completed', traceId: undefined });
    expect(query).toHaveBeenCalledTimes(6);
  });
});
