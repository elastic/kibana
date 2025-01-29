/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogger } from './types';

const createEventLoggerMock = () => {
  const mock: jest.Mocked<IEventLogger> = {
    logEvent: jest.fn(),
    updateEvents: jest.fn(),
    startTiming: jest.fn(),
    stopTiming: jest.fn(),
  };
  return mock;
};

export const eventLoggerMock = {
  create: createEventLoggerMock,
};
