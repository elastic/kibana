/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  CasesAnalyticsIndexFactory,
  CasesCommentsAnalyticsIndexFactory,
  CasesAttachmentsAnalyticsIndexFactory,
} from './index_factory';
import type { CasesServerStartDependencies } from '../types';
import { registerCAIBackfillTask } from './tasks/backfill_task';

export const createCasesAnalyticsIndices = async ({
  esClient,
  logger,
  isServerless,
  taskManager,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}) => {
  logger.debug('initializing factories');
  const casesIndexFactory = new CasesAnalyticsIndexFactory({
    logger,
    esClient,
    isServerless,
    taskManager,
  });
  const casesAttachmentsIndexFactory = new CasesAttachmentsAnalyticsIndexFactory({
    logger,
    esClient,
    isServerless,
    taskManager,
  });
  const casesCommentsIndexFactory = new CasesCommentsAnalyticsIndexFactory({
    logger,
    esClient,
    isServerless,
    taskManager,
  });

  return Promise.all([
    casesIndexFactory.createIndex(),
    casesAttachmentsIndexFactory.createIndex(),
    casesCommentsIndexFactory.createIndex(),
  ]);
};

export const registerCasesAnalyticsIndicesTasks = ({
  taskManagerSetup,
  logger,
  core,
}: {
  taskManagerSetup: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<CasesServerStartDependencies>;
}) => {
  registerCAIBackfillTask({ taskManagerSetup, logger, core });
};
