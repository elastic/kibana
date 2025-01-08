/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogSource, LogSourcesService } from './types';
import { flattenLogSources } from './utils';

const LOG_SOURCES: LogSource[] = [{ indexPattern: 'logs-*-*' }];
export const createLogSourcesServiceMock = (
  logSources: LogSource[] = LOG_SOURCES
): LogSourcesService => {
  let sources = logSources;
  return {
    async getLogSources() {
      return Promise.resolve(sources);
    },
    async getFlattenedLogSources() {
      return Promise.resolve(flattenLogSources(sources));
    },
    async setLogSources(nextLogSources: LogSource[]) {
      sources = nextLogSources;
      return Promise.resolve();
    },
  };
};
