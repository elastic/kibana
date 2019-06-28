/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./joins/left_inner_join', () => ({
  LeftInnerJoin: Object
}));

jest.mock('./tooltips/join_tooltip_property', () => ({
  JoinTooltipProperty: Object
}));

import { VectorLayer } from './vector_layer';

describe('_canSkipSourceUpdate', () => {
  const SOURCE_DATA_REQUEST_ID = 'foo';

  describe('isQueryAware', () => {

    const queryAwareSourceMock = {
      isTimeAware: () => { return false; },
      isRefreshTimerAware: () => { return false; },
      isFilterByMapBounds: () => { return false; },
      isFieldAware: () => { return false; },
      isQueryAware: () => { return true; },
      isGeoGridPrecisionAware: () => { return false; },
    };
    const prevFilters = [];
    const prevQuery = {
      language: 'kuery',
      query: 'machine.os.keyword : "win 7"',
      queryLastTriggeredAt: '2019-04-25T20:53:22.331Z'
    };

    describe('applyGlobalQuery is false', () => {

      const prevApplyGlobalQuery = false;

      const vectorLayer = new VectorLayer({
        layerDescriptor: {
          __dataRequests: [
            {
              dataId: SOURCE_DATA_REQUEST_ID,
              dataMeta: {
                applyGlobalQuery: prevApplyGlobalQuery,
                filters: prevFilters,
                query: prevQuery,
              }
            }
          ]
        }
      });

      it('can skip update when filter changes', async () => {
        const searchFilters = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: [prevQuery],
          query: prevQuery,
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(true);
      });

      it('can skip update when query changes', async () => {
        const searchFilters = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            query: 'a new query string',
          }
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(true);
      });

      it('can not skip update when query is refreshed', async () => {
        const searchFilters = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            queryLastTriggeredAt: 'sometime layer when Refresh button is clicked'
          }
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when applyGlobalQuery changes', async () => {
        const searchFilters = {
          applyGlobalQuery: !prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(false);
      });
    });

    describe('applyGlobalQuery is true', () => {

      const prevApplyGlobalQuery = true;

      const vectorLayer = new VectorLayer({
        layerDescriptor: {
          __dataRequests: [
            {
              dataId: SOURCE_DATA_REQUEST_ID,
              dataMeta: {
                applyGlobalQuery: prevApplyGlobalQuery,
                filters: prevFilters,
                query: prevQuery,
              }
            }
          ]
        }
      });

      it('can not skip update when filter changes', async () => {
        const searchFilters = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: [prevQuery],
          query: prevQuery,
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when query changes', async () => {
        const searchFilters = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            query: 'a new query string',
          }
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when query is refreshed', async () => {
        const searchFilters = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            queryLastTriggeredAt: 'sometime layer when Refresh button is clicked'
          }
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when applyGlobalQuery changes', async () => {
        const searchFilters = {
          applyGlobalQuery: !prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery
        };

        const canSkipUpdate = await vectorLayer._canSkipSourceUpdate(queryAwareSourceMock, SOURCE_DATA_REQUEST_ID, searchFilters);

        expect(canSkipUpdate).toBe(false);
      });
    });
  });
});
