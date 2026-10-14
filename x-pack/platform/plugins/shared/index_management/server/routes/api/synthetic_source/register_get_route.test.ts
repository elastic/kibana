/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING } from '../../../../common/constants';
import { addBasePath } from '..';
import { RouterMock, routeDependencies, type RequestMock } from '../../../test/helpers';
import { getSyntheticSourceFallbackToStoredSource, registerGetRoute } from './register_get_route';

describe('[Index management API Routes] Synthetic source', () => {
  describe('getSyntheticSourceFallbackToStoredSource()', () => {
    it('returns false when the setting is missing', () => {
      expect(getSyntheticSourceFallbackToStoredSource({})).toBe(false);
    });

    it('reads a flat setting from defaults', () => {
      expect(
        getSyntheticSourceFallbackToStoredSource({
          defaults: {
            [SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING]: 'true',
          },
        })
      ).toBe(true);
    });

    it('reads a nested setting from defaults', () => {
      expect(
        getSyntheticSourceFallbackToStoredSource({
          defaults: {
            xpack: {
              mapping: {
                synthetic_source_fallback_to_stored_source: true,
              },
            },
          },
        })
      ).toBe(true);
    });

    it('uses transient settings before persistent and default settings', () => {
      expect(
        getSyntheticSourceFallbackToStoredSource({
          defaults: {
            [SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING]: 'false',
          },
          persistent: {
            [SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING]: 'false',
          },
          transient: {
            [SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING]: 'true',
          },
        })
      ).toBe(true);
    });

    it('uses persistent settings before default settings', () => {
      expect(
        getSyntheticSourceFallbackToStoredSource({
          defaults: {
            [SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING]: 'true',
          },
          persistent: {
            [SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING]: 'false',
          },
        })
      ).toBe(false);
    });
  });

  describe('GET /synthetic_source', () => {
    const router = new RouterMock();
    const getClusterSettings = jest.mocked(
      router.contextMock.core.elasticsearch.client.asInternalUser.cluster.getSettings
    );

    beforeAll(() => {
      registerGetRoute({
        ...routeDependencies,
        router,
      });
    });

    beforeEach(() => {
      getClusterSettings.mockReset();
    });

    it('returns whether synthetic source falls back to stored source', async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addBasePath('/synthetic_source'),
      };

      getClusterSettings.mockResolvedValue({
        persistent: {},
        transient: {},
        defaults: {
          [SYNTHETIC_SOURCE_FALLBACK_TO_STORED_SOURCE_SETTING]: 'true',
        },
      });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: {
          syntheticSourceFallbackToStoredSource: true,
        },
      });
      expect(getClusterSettings).toHaveBeenCalledWith({
        flat_settings: true,
        include_defaults: true,
      });
    });
  });
});
