/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { BatchIndexHelper } from './batch_index_helper';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const BATCH_INDEX_SIZE = 5;

const esClient = {
  bulk: emptyAsyncFunc,
};

afterEach(() => {
  sinon.restore();
});

test('Execute bulk index.', async () => {
  // Setup the bulk stub
  const bulkSpy = sinon.spy();
  esClient.bulk = bulkSpy;

  const batchIndexHelper = new BatchIndexHelper(esClient as EsClient, log, BATCH_INDEX_SIZE);

  // Submit index requests as many as 2 batches.
  for (let i = 0; i < BATCH_INDEX_SIZE * 2; i++) {
    await batchIndexHelper.index('mockindex', {});
  }

  expect(bulkSpy.calledTwice).toBeTruthy();
});

test('Do not execute bulk index without enough requests.', async () => {
  // Setup the bulk stub
  const bulkSpy = sinon.spy();
  esClient.bulk = bulkSpy;

  const batchIndexHelper = new BatchIndexHelper(esClient as EsClient, log, BATCH_INDEX_SIZE);

  // Submit index requests less than one batch.
  for (let i = 0; i < BATCH_INDEX_SIZE - 1; i++) {
    await batchIndexHelper.index('mockindex', {});
  }

  expect(bulkSpy.notCalled).toBeTruthy();
});

test('Skip bulk index if cancelled.', async () => {
  // Setup the bulk stub
  const bulkSpy = sinon.spy();
  esClient.bulk = bulkSpy;

  const batchIndexHelper = new BatchIndexHelper(esClient as EsClient, log, BATCH_INDEX_SIZE);
  batchIndexHelper.cancel();

  // Submit index requests more than one batch.
  for (let i = 0; i < BATCH_INDEX_SIZE + 1; i++) {
    await batchIndexHelper.index('mockindex', {});
  }

  expect(bulkSpy.notCalled).toBeTruthy();
});
