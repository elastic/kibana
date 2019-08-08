/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { Logger } from './log';
import { ConsoleLoggerFactory } from './utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

afterEach(() => {
  sinon.restore();
});

// test('Execute update job', async () => {

// })
