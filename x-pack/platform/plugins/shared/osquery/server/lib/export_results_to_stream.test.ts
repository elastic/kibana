/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { exportResultsToStream } from './export_results_to_stream';
import { createCsvFormatter } from './format_results';
import type { ResultFormatter, ExportMetadata } from './format_results';

/**
 * Collects all data from a stream until it ends.
 * Rejects if the stream emits an error.
 */
const collectStream = (stream: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
    stream.on('error', reject);
  });

/**
 * Waits for a stream to close (either end or destroy).
 * Does not reject on error — use this when you expect stream destruction.
 */
const waitForStreamClose = (stream: NodeJS.ReadableStream): Promise<void> =>
  new Promise((resolve) => {
    stream.on('close', resolve);
    stream.on('end', resolve);
    stream.on('error', resolve);
    (stream as import('stream').PassThrough).resume();
  });

const createMockEsClient = () =>
  ({
    openPointInTime: jest.fn().mockResolvedValue({ id: 'test-pit-id' }),
    closePointInTime: jest.fn().mockResolvedValue({}),
    search: jest.fn(),
  } as unknown as jest.Mocked<ElasticsearchClient>);

const createMockFormatter = (): ResultFormatter => ({
  contentType: 'application/ndjson',
  fileExtension: 'ndjson',
  opening: jest.fn().mockReturnValue('{"_meta":{}}\n'),
  row: jest.fn().mockImplementation((record) => JSON.stringify(record) + '\n'),
  closing: jest.fn().mockReturnValue(null),
});

const createMockHit = (id: string, fields: Record<string, unknown[]> = {}) => ({
  _id: id,
  _index: 'test-index',
  _source: { agent: { id: `agent-${id}` } },
  fields,
  sort: [id],
});

const metadata: ExportMetadata = {
  action_id: 'test-action',
  timestamp: '2024-01-01T00:00:00.000Z',
  exported_by: 'test-user',
  format: 'ndjson',
};

describe('exportResultsToStream', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let aborted$: Subject<void>;

  beforeEach(() => {
    esClient = createMockEsClient() as jest.Mocked<ElasticsearchClient>;
    logger = loggingSystemMock.createLogger();
    aborted$ = new Subject<void>();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PIT lifecycle', () => {
    it('should open PIT with correct index and keep_alive before searching', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      await exportResultsToStream({
        esClient,
        index: 'logs-osquery_manager.result-default',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect(esClient.openPointInTime).toHaveBeenCalledWith(
        {
          index: 'logs-osquery_manager.result-default',
          keep_alive: '5m',
        },
        { signal: expect.any(AbortSignal) }
      );
    });

    it('should close PIT after stream completes', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'test-pit-id' });
    });

    it('should close PIT when max results limit is exceeded', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [createMockHit('1')], total: { value: 600_000 } },
      });

      await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'test-pit-id' });
    });

    it('should close PIT when ES search error occurs mid-stream', async () => {
      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 2 } },
        })
        .mockRejectedValueOnce(new Error('ES cluster unavailable'));

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'test-pit-id' });
    });

    it('should not close PIT twice when cleanup is called multiple times', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(esClient.closePointInTime).toHaveBeenCalledTimes(1);
    });

    it('should log debug when PIT close fails', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });
      (esClient.closePointInTime as jest.Mock).mockRejectedValueOnce(
        new Error('PIT already expired')
      );

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to close PIT'));
    });
  });

  describe('max result guardrail', () => {
    it('should return error object when total exceeds 500,000', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [createMockHit('1')], total: { value: 500_001 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect('statusCode' in result).toBe(true);
      if ('statusCode' in result) {
        expect(result.statusCode).toBe(400);
        expect(result.message).toContain('500,000');
      }
    });

    it('should include the actual count in the error message when limit exceeded', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 600_000 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect('statusCode' in result).toBe(true);
      if ('statusCode' in result) {
        expect(result.message).toContain('600,000');
      }
    });

    it('should return stream (not error) when total equals 500,000 exactly', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 500_000 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect('statusCode' in result).toBe(false);
      // Drain the stream to clean up
      await collectStream(result as NodeJS.ReadableStream);
    });

    it('should handle numeric total (not object) correctly', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: 200 },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect('statusCode' in result).toBe(false);
      await collectStream(result as NodeJS.ReadableStream);
    });

    it('should handle missing total (treats as 0) and not return error', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: undefined },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect('statusCode' in result).toBe(false);
      await collectStream(result as NodeJS.ReadableStream);
    });
  });

  describe('search_after pagination', () => {
    it('should stream all results from first page when total fits in one page', async () => {
      const hits = [
        createMockHit('1', { 'osquery.name': ['alice'] }),
        createMockHit('2', { 'osquery.name': ['bob'] }),
      ];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits, total: { value: 2 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 2 } },
        });

      const formatter = createMockFormatter();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(formatter.row).toHaveBeenCalledTimes(2);
    });

    it('should paginate using search_after when first page has results', async () => {
      const page1Hits = [createMockHit('1'), createMockHit('2')];
      const page2Hits = [createMockHit('3')];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: page1Hits, total: { value: 3 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: page2Hits, total: { value: 3 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 3 } },
        });

      const formatter = createMockFormatter();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(formatter.row).toHaveBeenCalledTimes(3);
    });

    it('should pass the sort value of the last hit as search_after for subsequent pages', async () => {
      const page1Hits = [createMockHit('hit-a'), createMockHit('hit-b')];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: page1Hits, total: { value: 2 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 2 } },
        });

      const formatter = createMockFormatter();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      // Second search call should include search_after from last hit of page1
      expect(esClient.search).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ search_after: ['hit-b'] }),
        expect.anything()
      );
    });

    it('should stop pagination when an empty page is returned', async () => {
      const hits = [createMockHit('1')];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits, total: { value: 1 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 1 } },
        });

      const formatter = createMockFormatter();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      // First page search (synchronous in exportResultsToStream) + one pagination call that returns empty
      expect(esClient.search).toHaveBeenCalledTimes(2);
    });

    it('should request only agent source when ecsMapping is not provided', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: ['agent'],
        }),
        expect.anything()
      );
    });

    it('should request full source when ecsMapping is provided', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
        ecsMapping: { 'process.pid': { field: 'pid' } },
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: true,
        }),
        expect.anything()
      );
    });
  });

  describe('formatter integration', () => {
    it('should call opening() with enriched metadata including total_results', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 42 } },
      });

      const formatter = createMockFormatter();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(formatter.opening).toHaveBeenCalledWith(
        expect.objectContaining({ total_results: 42 })
      );
    });

    it('should call finalizeColumns with deduplicated first-page records', async () => {
      const hitWithDuplicates = createMockHit('1', {
        'osquery.pid': ['123'],
        'osquery.pid.number': [123],
        'osquery.pid.text': ['123'],
        'osquery.name': ['proc'],
      });

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [hitWithDuplicates], total: { value: 1 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 1 } },
        });

      const formatter = createMockFormatter();
      formatter.finalizeColumns = jest.fn();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(formatter.finalizeColumns).toHaveBeenCalledWith([
        {
          'agent.id': 'agent-1',
          'osquery.pid.number': 123,
          'osquery.name': 'proc',
        },
      ]);
    });

    it('warns once when CSV pagination introduces a field absent from the first page', async () => {
      const hit1 = createMockHit('1', { 'osquery.common': ['a'] });
      const hit2 = createMockHit('2', {
        'osquery.common': ['b'],
        'osquery.appears_late': ['late'],
      });

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [hit1], total: { value: 2 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [hit2], total: { value: 2 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 2 } },
        });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createCsvFormatter(),
        metadata: { ...metadata, format: 'csv' },
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('first result page'),
        expect.objectContaining({
          labels: expect.objectContaining({
            example_field: 'osquery.appears_late',
            format: 'csv',
          }),
        })
      );
    });

    it('should call row() with isFirst=true for the first row and isFirst=false for subsequent rows', async () => {
      const hits = [createMockHit('1'), createMockHit('2'), createMockHit('3')];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits, total: { value: 3 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 3 } },
        });

      const formatter = createMockFormatter();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      const rowCalls = (formatter.row as jest.Mock).mock.calls;
      expect(rowCalls[0][1]).toBe(true); // first row
      expect(rowCalls[1][1]).toBe(false); // second row
      expect(rowCalls[2][1]).toBe(false); // third row
    });

    it('should call closing() at the end of stream and write its output', async () => {
      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 1 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 1 } },
        });

      const formatter = createMockFormatter();
      (formatter.closing as jest.Mock).mockReturnValue(']}\n');

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      const output = await collectStream(result as NodeJS.ReadableStream);

      expect(formatter.closing).toHaveBeenCalled();
      expect(output).toContain(']}\n');
    });

    it('should write opening content to stream when opening() returns non-null', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const formatter = createMockFormatter();
      (formatter.opening as jest.Mock).mockReturnValue('OPENING_CONTENT\n');

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      const output = await collectStream(result as NodeJS.ReadableStream);

      expect(output).toContain('OPENING_CONTENT');
    });

    it('should write nothing for opening when opening() returns null', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const formatter = createMockFormatter();
      (formatter.opening as jest.Mock).mockReturnValue(null);
      (formatter.closing as jest.Mock).mockReturnValue(null);

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      const output = await collectStream(result as NodeJS.ReadableStream);

      expect(output).toBe('');
    });

    it('should track isFirst correctly across page boundaries', async () => {
      const page1Hits = [createMockHit('p1-1')];
      const page2Hits = [createMockHit('p2-1'), createMockHit('p2-2')];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: page1Hits, total: { value: 3 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: page2Hits, total: { value: 3 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 3 } },
        });

      const formatter = createMockFormatter();
      (formatter.opening as jest.Mock).mockReturnValue(null);

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      await collectStream(result as NodeJS.ReadableStream);

      const rowCalls = (formatter.row as jest.Mock).mock.calls;
      expect(rowCalls).toHaveLength(3);
      expect(rowCalls[0][1]).toBe(true); // first row across pages
      expect(rowCalls[1][1]).toBe(false);
      expect(rowCalls[2][1]).toBe(false);
    });
  });

  describe('empty results', () => {
    it('should return a stream (not error) when no results found', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      expect('statusCode' in result).toBe(false);
      await collectStream(result as NodeJS.ReadableStream);
    });

    it('should write opening and closing but no rows when result set is empty', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const formatter = createMockFormatter();
      (formatter.closing as jest.Mock).mockReturnValue('CLOSING\n');

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      const output = await collectStream(result as NodeJS.ReadableStream);

      expect(formatter.row).not.toHaveBeenCalled();
      expect(output).toContain('{"_meta":');
      expect(output).toContain('CLOSING');
    });

    it('should produce a zero-byte body for CSV when result set is empty and no csv_columns hint', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createCsvFormatter(),
        metadata: { ...metadata, format: 'csv' },
        aborted$,
        logger,
      });

      const output = await collectStream(result as NodeJS.ReadableStream);

      expect(output).toBe('');
    });

    it('should emit CSV header only when result set is empty but csv_columns is provided', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createCsvFormatter(),
        metadata: {
          ...metadata,
          format: 'csv',
          csv_columns: ['agent.name', 'process.pid'],
        },
        aborted$,
        logger,
      });

      const output = await collectStream(result as NodeJS.ReadableStream);

      expect(output).toBe('agent.name,process.pid\n');
    });

    it('should end stream cleanly when result set is empty', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await expect(collectStream(result as NodeJS.ReadableStream)).resolves.toBeDefined();
    });
  });

  describe('abort handling', () => {
    it('should destroy the stream when aborted$ emits', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [createMockHit('1')], total: { value: 1 } },
      });

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      aborted$.next();

      expect((result as import('stream').PassThrough).destroyed).toBe(true);
    });

    it('should close PIT after abort and stream cleanup', async () => {
      // Hold the second search so we can abort mid-stream
      let resolveSecondSearch!: (value: unknown) => void;

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 2 } },
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecondSearch = resolve;
            })
        );

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      // Let the stream start (setTimeout fires and first page processes)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Abort while second search is pending
      aborted$.next();
      resolveSecondSearch({ hits: { hits: [], total: { value: 2 } } });

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect(esClient.closePointInTime).toHaveBeenCalled();
    });

    it('should not write rows after abort', async () => {
      const hits = Array.from({ length: 5 }, (_, i) => createMockHit(String(i)));

      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits, total: { value: 5 } },
      });

      const formatter = createMockFormatter();

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter,
        metadata,
        aborted$,
        logger,
      });

      // Abort before the deferred setTimeout fires
      aborted$.next();

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect(formatter.row).not.toHaveBeenCalled();
    });
  });

  describe('ES search error mid-stream', () => {
    it('should destroy the stream when search throws during pagination', async () => {
      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 5 } },
        })
        .mockRejectedValueOnce(new Error('Connection reset'));

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect((result as import('stream').PassThrough).destroyed).toBe(true);
    });

    it('should log the error when search throws during streaming', async () => {
      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 5 } },
        })
        .mockRejectedValueOnce(new Error('Shard failure'));

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Export stream error'),
        expect.objectContaining({
          labels: expect.objectContaining({ action_id: 'test-action' }),
        })
      );
    });

    it('should log structured labels (action_id, format, total_results) on stream error', async () => {
      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 17 } },
        })
        .mockRejectedValueOnce(new Error('Connection reset'));

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata: {
          action_id: 'action-log-test',
          timestamp: '2024-01-01T00:00:00.000Z',
          exported_by: 'test-user',
          format: 'csv',
        },
        aborted$,
        logger,
      });

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect(logger.error).toHaveBeenCalledWith('Export stream error: Connection reset', {
        labels: {
          action_id: 'action-log-test',
          format: 'csv',
          total_results: 17,
        },
      });
    });

    it('should include execution_count in labels for scheduled-query exports', async () => {
      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 3 } },
        })
        .mockRejectedValueOnce(new Error('Shard unavailable'));

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata: {
          action_id: 'schedule-xyz',
          timestamp: '2024-01-01T00:00:00.000Z',
          exported_by: 'test-user',
          format: 'ndjson',
          execution_count: 42,
        },
        aborted$,
        logger,
      });

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect(logger.error).toHaveBeenCalledWith('Export stream error: Shard unavailable', {
        labels: {
          action_id: 'schedule-xyz',
          format: 'ndjson',
          total_results: 3,
          execution_count: 42,
        },
      });
    });

    it('should not log error when stream is destroyed due to abort', async () => {
      // Hold the second search so we control when it resolves
      let resolveSecondSearch!: (value: unknown) => void;

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits: [createMockHit('1')], total: { value: 2 } },
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecondSearch = resolve;
            })
        );

      const result = await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      });

      // Allow stream loop to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Abort while second search is pending, then resolve it
      aborted$.next();
      resolveSecondSearch({ hits: { hits: [], total: { value: 2 } } });

      await waitForStreamClose(result as NodeJS.ReadableStream);

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('backpressure handling', () => {
    it('should pause and await drain when stream.write returns false', async () => {
      const hits = [createMockHit('1'), createMockHit('2'), createMockHit('3')];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits, total: { value: 3 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 3 } },
        });

      const result = (await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      })) as import('stream').PassThrough;

      // Intercept write() after the first row to return false, then emit 'drain'
      // on the next tick so the loop can continue.
      let writeCount = 0;
      const realWrite = result.write.bind(result);
      jest.spyOn(result, 'write').mockImplementation((chunk: unknown, ...rest: unknown[]) => {
        writeCount += 1;
        // Return false on row 2 so the loop awaits drain; accept normally for others.
        if (writeCount === 3) {
          // Schedule a drain emission on the next microtask.
          setImmediate(() => result.emit('drain'));

          return false;
        }

        return realWrite(chunk as string, ...(rest as []));
      });

      await collectStream(result);

      // All 3 rows plus the opening write should have been attempted.
      // Loop paused on write #3 and resumed after drain.
      expect(writeCount).toBeGreaterThanOrEqual(4);
    });

    it('should not attach a drain listener when all writes succeed (fast consumer)', async () => {
      const hits = [createMockHit('1'), createMockHit('2')];

      (esClient.search as jest.Mock)
        .mockResolvedValueOnce({
          hits: { hits, total: { value: 2 } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [], total: { value: 2 } },
        });

      const result = (await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      })) as import('stream').PassThrough;

      const onceSpy = jest.spyOn(result, 'once');

      await collectStream(result);

      // No drain listener should have been installed because every write
      // returned true (real PassThrough default highWaterMark).
      const drainListens = onceSpy.mock.calls.filter((call) => call[0] === 'drain');
      expect(drainListens).toHaveLength(0);
    });

    it('should exit cleanly when abort fires while awaiting drain', async () => {
      const hits = [createMockHit('1'), createMockHit('2'), createMockHit('3')];

      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits, total: { value: 3 } },
      });

      const result = (await exportResultsToStream({
        esClient,
        index: 'test-index',
        query: { match_all: {} },
        formatter: createMockFormatter(),
        metadata,
        aborted$,
        logger,
      })) as import('stream').PassThrough;

      // Make the second write return false — and never emit drain. Abort fires instead.
      let writeCount = 0;
      jest.spyOn(result, 'write').mockImplementation(() => {
        writeCount += 1;
        if (writeCount === 2) {
          // Fire abort once the loop is awaiting drain
          setImmediate(() => aborted$.next());

          return false;
        }

        return true;
      });

      await waitForStreamClose(result);

      expect(result.destroyed).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('openPointInTime error', () => {
    it('should throw when openPointInTime fails', async () => {
      (esClient.openPointInTime as jest.Mock).mockRejectedValueOnce(new Error('Index not found'));

      await expect(
        exportResultsToStream({
          esClient,
          index: 'test-index',
          query: { match_all: {} },
          formatter: createMockFormatter(),
          metadata,
          aborted$,
          logger,
        })
      ).rejects.toThrow('Index not found');
    });

    it('should not attempt to close PIT when openPointInTime fails', async () => {
      (esClient.openPointInTime as jest.Mock).mockRejectedValueOnce(new Error('Cluster down'));

      await expect(
        exportResultsToStream({
          esClient,
          index: 'test-index',
          query: { match_all: {} },
          formatter: createMockFormatter(),
          metadata,
          aborted$,
          logger,
        })
      ).rejects.toThrow();

      expect(esClient.closePointInTime).not.toHaveBeenCalled();
    });
  });
});
