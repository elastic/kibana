/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { AnalyticsIndex } from '../analytics_index';
import { createCasesAnalyticsIndex } from '.';
import {
  CAI_CASES_BACKFILL_TASK_ID,
  CAI_CASES_INDEX_NAME,
  CAI_CASES_SOURCE_INDEX,
  CAI_CASES_SOURCE_QUERY,
} from './constants';
import { CAI_CASES_INDEX_MAPPINGS } from './mappings';
import { CAI_CASES_INDEX_SCRIPT_ID, CAI_CASES_INDEX_SCRIPT } from './painless_scripts';

jest.mock('../analytics_index');

const AnalyticsIndexMock = AnalyticsIndex as jest.Mock;

describe('createCasesAnalyticsIndex', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const taskManager = taskManagerMock.createStart();
  const isServerless = false;

  it('creates an index as expected', async () => {
    createCasesAnalyticsIndex({
      logger,
      esClient,
      taskManager,
      isServerless,
    });

    expect(AnalyticsIndexMock).toBeCalledWith({
      logger,
      esClient,
      isServerless,
      taskManager,
      indexName: CAI_CASES_INDEX_NAME,
      mappings: CAI_CASES_INDEX_MAPPINGS,
      painlessScriptId: CAI_CASES_INDEX_SCRIPT_ID,
      painlessScript: CAI_CASES_INDEX_SCRIPT,
      taskId: CAI_CASES_BACKFILL_TASK_ID,
      sourceIndex: CAI_CASES_SOURCE_INDEX,
      sourceQuery: CAI_CASES_SOURCE_QUERY,
    });
  });
});
