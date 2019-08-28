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
import { RepositoryIndexInitializer } from './repository_index_initializer';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {
  indices: {
    existsAlias: emptyAsyncFunc,
    create: emptyAsyncFunc,
    putAlias: emptyAsyncFunc,
  },
};

afterEach(() => {
  sinon.restore();
});

test('Initialize the repository index', async () => {
  // Setup the esClient spies
  const existsAliasSpy = sinon.fake.returns(false);
  const createSpy = sinon.spy();
  const putAliasSpy = sinon.spy();
  esClient.indices.existsAlias = existsAliasSpy;
  esClient.indices.create = createSpy;
  esClient.indices.putAlias = putAliasSpy;

  const initializer = new RepositoryIndexInitializer(
    'mockuri',
    'mockrevision',
    esClient as EsClient,
    log
  );
  await initializer.init();

  // Expect these indices functions to be called only once.
  expect(existsAliasSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledOnce).toBeTruthy();
  expect(putAliasSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledAfter(existsAliasSpy)).toBeTruthy();
  expect(putAliasSpy.calledAfter(createSpy)).toBeTruthy();
});
