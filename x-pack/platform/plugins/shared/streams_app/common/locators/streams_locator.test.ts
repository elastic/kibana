/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsAppLocatorDefinition } from './streams_locator';

describe('StreamsAppLocatorDefinition', () => {
  let locator: StreamsAppLocatorDefinition;

  beforeEach(() => {
    locator = new StreamsAppLocatorDefinition();
    jest.clearAllMocks();
  });

  describe('getLocation method', () => {
    describe('root path navigation', () => {
      it('should return root path when no parameters provided', async () => {
        const result = await locator.getLocation({});

        expect(result).toEqual({
          app: 'streams',
          path: '/',
          state: {},
        });
      });
    });

    describe('stream detail navigation', () => {
      it('should generate correct path for stream name only', async () => {
        const params = { name: 'test-stream' };
        const result = await locator.getLocation(params);

        expect(result).toEqual({
          app: 'streams',
          path: '/test-stream',
          state: {},
        });
      });

      it('should handle empty stream name', async () => {
        const params = { name: '' };
        const result = await locator.getLocation(params);

        expect(result).toEqual({
          app: 'streams',
          path: '/',
          state: {},
        });
      });
    });

    describe('management tab navigation', () => {
      it('should generate correct path for management tabs', async () => {
        const params = {
          name: 'test-stream',
          managementTab: 'retention',
        };
        const result = await locator.getLocation(params);

        expect(result).toEqual({
          app: 'streams',
          path: '/test-stream/management/retention',
          state: {},
        });
      });
    });

    describe('page state handling', () => {
      it('should include page state in URL for enrichment management tab', async () => {
        const pageState = {
          v: 1,
          dataSources: [
            {
              type: 'kql-samples',
              name: 'Test',
              query: { language: 'kuery', query: '_id: test-id' },
              enabled: true,
            },
          ],
        };
        const params = {
          name: 'test-stream',
          managementTab: 'enrichment',
          pageState,
        };

        const result = await locator.getLocation(params);

        expect(result).toEqual({
          app: 'streams',
          path: "/test-stream/management/enrichment?pageState=(dataSources:!((enabled:!t,name:Test,query:(language:kuery,query:'_id:%20test-id'),type:kql-samples)),v:1)",
          state: {},
        });
      });
    });
  });
});
