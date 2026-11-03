/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ImprovementsService } from './service';

/** The improvements store for one space, bound to the caller's Elasticsearch client. */
export const createImprovementsServiceFactory = (logger: Logger) => {
  return (esClient: ElasticsearchClient, spaceId: string): ImprovementsService =>
    new ImprovementsService({ esClient, logger, space: spaceId });
};
