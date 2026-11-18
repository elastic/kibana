/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { RecallRequest, RecallResponse } from '../../common/http_api/memory_recall';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import type { ContextEngineAnalyticsService } from '../telemetry';
import type { GetAiIndexDataReadServiceParams } from '../types';
import { createAiIndexRecallStore } from './ai_index_store';
import { recall } from './service';
import { createSessionEventsRecallStore } from './session_events_store';
import { createSessionMemoryRecallStore } from './session_memory_store';

/**
 * Recalls for one request. AI indices are read as the current user; the session stores are system
 * data streams, read as the internal user and scoped to `space` and the request's user and sessions.
 */
export const recallForRequest = ({
  request,
  body,
  esClient,
  internalEsClient,
  space,
  getAiIndexDataReadService,
  analyticsService,
}: {
  request: KibanaRequest;
  body: RecallRequest;
  esClient: ElasticsearchClient;
  internalEsClient: ElasticsearchClient;
  space: string;
  getAiIndexDataReadService: (params: GetAiIndexDataReadServiceParams) => AiIndexDataReadServiceApi;
  analyticsService: Pick<ContextEngineAnalyticsService, 'reportMemoryRecall'>;
}): Promise<RecallResponse> =>
  recall({
    esClient,
    analyticsService,
    request: body,
    stores: [
      createAiIndexRecallStore(getAiIndexDataReadService({ esClient, request })),
      createSessionMemoryRecallStore({ esClient: internalEsClient, space }),
      createSessionEventsRecallStore({ esClient: internalEsClient, space }),
    ],
  });
