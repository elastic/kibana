/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type LogsDataAccessPluginStart } from './plugin';
import { createLogDataServiceStartMock } from './services/log_data_service/log_data_service.mock';

export type Start = jest.Mocked<LogsDataAccessPluginStart>;

const createStartContract = (): Start => {
  const startContract: Start = {
    services: {
      logSourcesService: {
        getLogSources: jest.fn(),
        getFlattenedLogSources: jest.fn(),
        setLogSources: jest.fn(),
      },
      logDataService: createLogDataServiceStartMock(),
    },
  };
  return startContract;
};

export const logsDataAccessPluginMock = {
  createStartContract,
};
