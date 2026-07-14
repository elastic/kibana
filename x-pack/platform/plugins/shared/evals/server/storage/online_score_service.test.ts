/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AnyIDataStreamClient } from '@kbn/data-streams';
import { EvaluationIndices } from '@kbn/evals-common';
import {
  computeOnlineScoreDocumentId,
  OnlineScoreService,
  type BulkCreateOnlineScoresResult,
  type OnlineScoreDocument,
} from './online_score_service';

const createDataStreamsMock = () => {
  const create = jest.fn();
  const search = jest.fn();
  const dataStreamClient = {
    create,
    search,
  } as unknown as AnyIDataStreamClient;
  const coreDataStreams = {
    initializeClient: jest.fn().mockResolvedValue(dataStreamClient),
  } as unknown as DataStreamsStart;

  return {
    coreDataStreams,
    initializeClient: coreDataStreams.initializeClient as jest.Mock,
    create,
    search,
  };
};

const getBaseDocument = (): Omit<OnlineScoreDocument, '@timestamp'> => ({
  monitor: {
    id: 'workflow-1',
    name: 'Online Eval Workflow',
  },
  trace_id: 'trace-1',
  connector_id: 'connector-1',
  evaluator: {
    name: 'correctness',
    version: '1.0.0',
    kind: 'llm',
  },
  score: {
    name: 'factuality',
    value: 0.82,
    label: 'good',
    explanation: 'mostly correct',
    metadata: {
      reason: 'test',
    },
  },
});

describe('OnlineScoreService', () => {
  it('computes deterministic document ids and writes with create semantics', async () => {
    const logger = loggingSystemMock.createLogger();
    const document = getBaseDocument();
    const { coreDataStreams, initializeClient, create } = createDataStreamsMock();
    const capturedDocuments: Array<{ _id: string } & OnlineScoreDocument> = [];

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      capturedDocuments.push(...(documents as Array<{ _id: string } & OnlineScoreDocument>));
      return {
        errors: false,
        items: documents.map((item) => ({ create: { _id: item._id, status: 201 } })),
      };
    });

    const service = new OnlineScoreService(logger, coreDataStreams);
    const result = await service.bulkCreate([document]);

    expect(result).toEqual<BulkCreateOnlineScoresResult>({
      created: 1,
      skipped: 0,
      errors: [],
    });
    expect(initializeClient).toHaveBeenCalledWith(EvaluationIndices.ONLINE_SCORES);
    expect(create).toHaveBeenCalledWith({
      documents: expect.any(Array),
      refresh: 'wait_for',
    });
    expect(capturedDocuments.map(({ _id }) => _id)).toEqual([
      'workflow-1-trace-1-correctness-factuality',
    ]);
    expect(computeOnlineScoreDocumentId(capturedDocuments[0])).toBe(
      'workflow-1-trace-1-correctness-factuality'
    );
    expect(capturedDocuments[0]).toMatchObject({
      '@timestamp': expect.any(String),
      monitor: {
        id: 'workflow-1',
        name: 'Online Eval Workflow',
      },
      trace_id: 'trace-1',
      evaluator: {
        name: 'correctness',
      },
      score: {
        name: 'factuality',
      },
    });
  });

  it('treats 409 responses as idempotent skips', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();

    create.mockResolvedValue({
      errors: true,
      items: [{ create: { _id: 'workflow-1-trace-1-correctness-factuality', status: 409 } }],
    });

    const service = new OnlineScoreService(logger, coreDataStreams);
    const result = await service.bulkCreate([getBaseDocument()]);

    expect(result).toEqual({
      created: 0,
      skipped: 1,
      errors: [],
    });
  });
});
