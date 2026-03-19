/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindingEvaluatorService } from '../services/finding_evaluator_service';

const createMockEsClient = () => ({
  search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
  bulk: jest.fn().mockResolvedValue({ errors: false }),
});

const createMockSoClient = () => ({
  get: jest.fn(),
  find: jest.fn().mockResolvedValue({ total: 0, saved_objects: [] }),
  create: jest.fn(),
});

const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('FindingEvaluatorService', () => {
  let esClient: ReturnType<typeof createMockEsClient>;
  let soClient: ReturnType<typeof createMockSoClient>;
  let logger: ReturnType<typeof createMockLogger>;
  let service: FindingEvaluatorService;

  beforeEach(() => {
    esClient = createMockEsClient();
    soClient = createMockSoClient();
    logger = createMockLogger();
    jest.useFakeTimers();
    service = new FindingEvaluatorService(esClient as any, soClient as any, logger as any);
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  it('starts and stops without error', () => {
    service.start();
    expect(logger.info).toHaveBeenCalledWith('Finding evaluator service started');
    service.stop();
    expect(logger.info).toHaveBeenCalledWith('Finding evaluator service stopped');
  });

  it('does not double-start', () => {
    service.start();
    service.start();
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('skips when no new results are found', async () => {
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } });
    service.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('evaluates osquery results and writes findings', async () => {
    const mockRule = {
      rule_id: 'cis-macos-1.1',
      name: 'Test Rule',
      description: 'desc',
      remediation: 'fix',
      benchmark: {
        id: 'cis_macos',
        name: 'CIS macOS',
        version: 'v1.0.0',
        posture_type: 'endpoint',
      },
      rule_number: '1.1',
      section: 'System Preferences',
      level: 1,
      platform: 'darwin',
      frameworks: [],
      tags: [],
      resource_type: 'system',
    };

    soClient.get.mockResolvedValueOnce({ attributes: mockRule });

    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'hit1',
            _source: {
              '@timestamp': '2024-01-01T00:00:00Z',
              action_id: 'action1',
              action_data: { query: { pack_id: 'compliance-cis-macos-1.1' } },
              host: {
                id: 'host1',
                hostname: 'my-mac',
                os: { family: 'darwin', name: 'macOS', version: '14.0', platform: 'darwin' },
              },
              agent: { id: 'agent1', type: 'osquery', version: '1.0' },
              osquery: { result: { rows: [{ key: 'value' }] } },
            },
          },
        ],
      },
    });

    service.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(esClient.bulk).toHaveBeenCalled();
    const bulkBody = esClient.bulk.mock.calls[0][0].body;
    expect(bulkBody).toHaveLength(2);
    expect(bulkBody[1].result.evaluation).toBe('passed');
    expect(bulkBody[1].host.id).toBe('host1');
  });

  it('marks findings as not_applicable on error results', async () => {
    const mockRule = {
      rule_id: 'cis-macos-1.1',
      name: 'Test Rule',
      description: 'desc',
      remediation: 'fix',
      benchmark: {
        id: 'cis_macos',
        name: 'CIS macOS',
        version: 'v1.0.0',
        posture_type: 'endpoint',
      },
      rule_number: '1.1',
      section: 'Test',
      level: 1,
      platform: 'darwin',
      frameworks: [],
      tags: [],
      resource_type: 'system',
    };

    soClient.get.mockResolvedValueOnce({ attributes: mockRule });

    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'hit1',
            _source: {
              '@timestamp': '2024-01-01T00:00:00Z',
              action_id: 'action1',
              action_data: {
                query: { pack_id: 'compliance-cis-macos-1.1' },
                error: 'table not found',
              },
              host: { id: 'host1' },
              agent: { id: 'agent1' },
            },
          },
        ],
      },
    });

    service.start();
    await jest.advanceTimersByTimeAsync(0);

    const bulkBody = esClient.bulk.mock.calls[0][0].body;
    expect(bulkBody[1].result.evaluation).toBe('not_applicable');
  });

  it('clears rule cache', () => {
    service.clearCache();
  });
});
