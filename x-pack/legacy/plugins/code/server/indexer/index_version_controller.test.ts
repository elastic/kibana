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
import { IndexVersionController } from './index_version_controller';
import pkg from './schema/version.json';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {
  reindex: emptyAsyncFunc,
  indices: {
    getMapping: emptyAsyncFunc,
    create: emptyAsyncFunc,
    updateAliases: emptyAsyncFunc,
    delete: emptyAsyncFunc,
  },
};

afterEach(() => {
  sinon.restore();
});

test('Index upgrade is triggered.', async () => {
  // Setup the esClient spies
  const getMappingSpy = sinon.fake.returns(
    Promise.resolve({
      mockindex: {
        mappings: {
          _meta: {
            version: 0,
          },
        },
      },
    })
  );
  const updateAliasesSpy = sinon.spy();
  const createSpy = sinon.spy();
  const deleteSpy = sinon.spy();
  const reindexSpy = sinon.spy();
  esClient.indices.getMapping = getMappingSpy;
  esClient.indices.updateAliases = updateAliasesSpy;
  esClient.indices.create = createSpy;
  esClient.indices.delete = deleteSpy;
  esClient.reindex = reindexSpy;

  const versionController = new IndexVersionController(esClient as EsClient, log);
  const req: IndexCreationRequest = {
    index: 'mockindex',
    settings: {},
    schema: {},
  };
  await versionController.tryUpgrade(req);

  expect(getMappingSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledOnce).toBeTruthy();
  expect(reindexSpy.calledOnce).toBeTruthy();
  expect(updateAliasesSpy.calledOnce).toBeTruthy();
  expect(deleteSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledAfter(getMappingSpy)).toBeTruthy();
  expect(reindexSpy.calledAfter(getMappingSpy)).toBeTruthy();
  expect(updateAliasesSpy.calledAfter(getMappingSpy)).toBeTruthy();
  expect(deleteSpy.calledAfter(getMappingSpy)).toBeTruthy();
});

test('Index upgrade is skipped.', async () => {
  // Setup the esClient spies
  const getMappingSpy = sinon.fake.returns(
    Promise.resolve({
      mockindex: {
        mappings: {
          _meta: {
            version: pkg.codeIndexVersion,
          },
        },
      },
    })
  );
  const updateAliasesSpy = sinon.spy();
  const createSpy = sinon.spy();
  const deleteSpy = sinon.spy();
  const reindexSpy = sinon.spy();
  esClient.indices.getMapping = getMappingSpy;
  esClient.indices.updateAliases = updateAliasesSpy;
  esClient.indices.create = createSpy;
  esClient.indices.delete = deleteSpy;
  esClient.reindex = reindexSpy;

  const versionController = new IndexVersionController(esClient as EsClient, log);
  const req: IndexCreationRequest = {
    index: 'mockindex',
    settings: {},
    schema: {},
  };
  await versionController.tryUpgrade(req);

  expect(getMappingSpy.calledOnce).toBeTruthy();
  expect(createSpy.notCalled).toBeTruthy();
  expect(reindexSpy.notCalled).toBeTruthy();
  expect(updateAliasesSpy.notCalled).toBeTruthy();
  expect(deleteSpy.notCalled).toBeTruthy();
});
