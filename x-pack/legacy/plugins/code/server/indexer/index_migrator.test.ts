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
import { IndexCreationRequest } from './index_creation_request';
import { IndexMigrator } from './index_migrator';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {
  reindex: emptyAsyncFunc,
  indices: {
    create: emptyAsyncFunc,
    updateAliases: emptyAsyncFunc,
    delete: emptyAsyncFunc,
  },
};

afterEach(() => {
  sinon.restore();
});

test('Normal index migration steps.', async () => {
  // Setup the esClient spies
  const updateAliasesSpy = sinon.spy();
  const createSpy = sinon.spy();
  const deleteSpy = sinon.spy();
  const reindexSpy = sinon.spy();
  esClient.indices.updateAliases = updateAliasesSpy;
  esClient.indices.create = createSpy;
  esClient.indices.delete = deleteSpy;
  esClient.reindex = reindexSpy;

  const migrator = new IndexMigrator(esClient as EsClient, log);
  const req: IndexCreationRequest = {
    index: 'mockindex',
    settings: {},
    schema: {},
  };
  await migrator.migrateIndex('mockoldindex', req);

  expect(createSpy.calledOnce).toBeTruthy();
  expect(reindexSpy.calledOnce).toBeTruthy();
  expect(updateAliasesSpy.calledOnce).toBeTruthy();
  expect(deleteSpy.calledOnce).toBeTruthy();
  expect(reindexSpy.calledAfter(createSpy)).toBeTruthy();
  expect(updateAliasesSpy.calledAfter(reindexSpy)).toBeTruthy();
  expect(deleteSpy.calledAfter(updateAliasesSpy)).toBeTruthy();
});
