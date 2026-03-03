/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { AlertDeletionContext } from '../alert_deletion_client';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '../../plugin';

export const getLastRun = async (context: AlertDeletionContext, req: KibanaRequest) => {
  const esClient = await context.elasticsearchClientPromise;
  const spacesService = await context.spacesService;
  const currentSpaceId = spacesService ? spacesService.getSpaceId(req) : 'default';

  try {
    const searchResponse: SearchResponse<IValidatedEvent> = await esClient.search({
      index: '.kibana-event-log*',
      query: {
        bool: {
          filter: [
            { term: { 'event.action': EVENT_LOG_ACTIONS.deleteAlerts } },
            { term: { 'event.provider': EVENT_LOG_PROVIDER } },
            { term: { 'kibana.space_ids': currentSpaceId } },
          ],
        },
      },
      size: 1,
      sort: [{ [TIMESTAMP]: 'desc' }],
    });

    if (searchResponse.hits.hits.length > 0) {
      return searchResponse.hits.hits[0]._source?.['@timestamp'];
    }
  } catch (err) {
    context.logger.error(`Error getting last run date: ${err.message}`);
  }
};
