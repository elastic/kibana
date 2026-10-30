/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import { OSQUERY_SEARCH_STRATEGY } from '../../search_strategy/constants';
import { getActionResponses } from './utils';

type ResponsesByActionId = Record<string, unknown>;

const searchClient = (responsesByActionId: ResponsesByActionId) =>
  ({
    search: jest.fn().mockReturnValue(
      of({
        rawResponse: {
          aggregations: { aggs: { responses_by_action_id: responsesByActionId } },
        },
      })
    ),
  } as unknown as IScopedSearchClient);

describe('getActionResponses', () => {
  describe('search request', () => {
    it('asks the action results strategy for the targeted agent count', async () => {
      const search = searchClient({
        doc_count: 0,
        rows_count: { value: 0 },
        responses: { buckets: [] },
      });

      await lastValueFrom(getActionResponses(search, 'action-1', 5, undefined, 'default'));

      expect(search.search).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'action-1',
          agentsCount: 5,
          factoryQueryType: OsqueryQueries.actionResults,
          kuery: '',
          sort: { direction: Direction.desc, field: '@timestamp' },
          spaceId: 'default',
        }),
        { strategy: OSQUERY_SEARCH_STRATEGY }
      );
    });
  });

  describe('counting the agents that answered', () => {
    it('falls back to the document count when no distinct-agent aggregation is present', async () => {
      const search = searchClient({
        doc_count: 2,
        rows_count: { value: 5 },
        responses: {
          buckets: [
            { key: 'success', doc_count: 1 },
            { key: 'error', doc_count: 1 },
          ],
        },
      });

      const response = await lastValueFrom(
        getActionResponses(search, 'action-1', 5, undefined, 'default')
      );

      expect(response).toEqual({
        action_id: 'action-1',
        docs: 5,
        failed: 1,
        pending: 3,
        responded: 2,
        successful: 1,
      });
    });

    it('counts the exact responding agent buckets, not the response documents', async () => {
      const search = searchClient({
        doc_count: 4,
        rows_count: { value: 4 },
        responding_agent_ids: { buckets: [{ key: 'agent-a' }, { key: 'agent-b' }] },
        responses: { buckets: [{ key: 'success', doc_count: 4 }] },
      });

      const response = await lastValueFrom(
        getActionResponses(search, 'action-1', 3, undefined, 'default')
      );

      expect(response).toMatchObject({ responded: 2, pending: 1 });
    });

    it('counts distinct responding agents, so a duplicate response does not complete the action', async () => {
      const search = searchClient({
        doc_count: 2,
        rows_count: { value: 2 },
        responding_agents: { value: 1 },
        responses: { buckets: [{ key: 'success', doc_count: 2 }] },
      });

      const response = await lastValueFrom(
        getActionResponses(search, 'action-1', 2, undefined, 'default')
      );

      expect(response.pending).toBe(1);
      expect(response.responded).toBe(1);
    });
  });
});
