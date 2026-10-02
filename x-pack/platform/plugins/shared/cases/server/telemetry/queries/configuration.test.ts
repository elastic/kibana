/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CustomFieldTypes } from '../../../common/types/domain';
import { getConfigurationTelemetryData } from './configuration';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('configuration', () => {
  describe('getConfigurationTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    savedObjectsClient.find.mockResolvedValue({
      total: 5,
      saved_objects: [],
      per_page: 5,
      page: 1,
      aggregations: {
        closureType: {
          buckets: [
            { doc_count: 1, key: 'close-by-user' },
            { doc_count: 2, key: 'close-by-pushing' },
          ],
        },
      },
    });
    const customFieldsMock = [
      {
        key: 'foobar1',
        label: 'foobar1',
        type: CustomFieldTypes.TEXT,
        required: false,
      },
      {
        key: 'foobar2',
        label: 'foobar2',
        type: CustomFieldTypes.TOGGLE,
        required: true,
      },
      {
        key: 'foobar3',
        label: 'foobar3',
        type: 'foo',
        required: true,
      },
      {
        key: 'foobar4',
        label: 'foobar4',
        type: CustomFieldTypes.TOGGLE,
        required: true,
      },
    ];
    const emptyCustomFieldsMock = {
      customFields: {
        required: 0,
        totals: 0,
        totalsByType: {},
      },
    };
    const emptyCustomStatusesMock = {
      customStatuses: {
        configurations: 0,
        statuses: { open: 0, inProgress: 0, closed: 0 },
        pausing: {
          configurations: 0,
          statuses: { open: 0, inProgress: 0, closed: 0 },
          customizedReasons: 0,
        },
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      const res = await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res).toEqual({
        all: {
          closure: {
            manually: 1,
            automatic: 2,
          },
          ...emptyCustomFieldsMock,
          ...emptyCustomStatusesMock,
        },
        sec: { ...emptyCustomFieldsMock },
        obs: { ...emptyCustomFieldsMock },
        main: { ...emptyCustomFieldsMock },
      });
    });

    it('should call find with correct arguments', async () => {
      await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        aggs: {
          closureType: {
            terms: {
              field: 'cases-configure.attributes.closure_type',
            },
          },
        },
        filter: undefined,
        page: 1,
        perPage: 5,
        type: 'cases-configure',
        namespaces: ['*'],
      });
    });

    it('returns correct res with customFields', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 5,
        saved_objects: [
          {
            score: 1,
            id: 'test',
            references: [],
            type: 'cases',
            attributes: {
              owner: 'cases',
              customFields: customFieldsMock,
            },
          },
          {
            score: 1,
            id: 'test1',
            references: [],
            type: 'cases',
            attributes: {
              owner: 'observability',
              customFields: customFieldsMock,
            },
          },
        ],
        per_page: 5,
        page: 1,
        aggregations: {
          closureType: {
            buckets: [
              { doc_count: 1, key: 'close-by-user' },
              { doc_count: 2, key: 'close-by-pushing' },
            ],
          },
        },
      });

      const res = await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res).toEqual({
        all: {
          closure: {
            manually: 1,
            automatic: 2,
          },
          customFields: {
            totals: 8,
            required: 6,
            totalsByType: {
              text: 2,
              toggle: 4,
              foo: 2,
            },
          },
          ...emptyCustomStatusesMock,
        },
        sec: { ...emptyCustomFieldsMock },
        obs: {
          customFields: {
            totals: 4,
            required: 3,
            totalsByType: {
              text: 1,
              toggle: 2,
              foo: 1,
            },
          },
        },
        main: {
          customFields: {
            totals: 4,
            required: 3,
            totalsByType: {
              text: 1,
              toggle: 2,
              foo: 1,
            },
          },
        },
      });
    });

    it('counts configured custom statuses per category', async () => {
      const builtIn = (key: string) => ({
        key,
        label: key,
        category: key,
        order: 0,
        isDefault: true,
        disabled: false,
      });
      const custom = (key: string, category: string) => ({
        key,
        label: key,
        category,
        order: 1,
        isDefault: false,
        disabled: false,
      });

      savedObjectsClient.find.mockResolvedValue({
        total: 5,
        saved_objects: [
          {
            score: 1,
            id: 'test',
            references: [],
            type: 'cases',
            attributes: {
              owner: 'securitySolution',
              statuses: [
                builtIn('open'),
                builtIn('in-progress'),
                builtIn('closed'),
                custom('awaiting_customer', 'in-progress'),
                custom('on_hold', 'in-progress'),
                custom('closed_duplicate', 'closed'),
              ],
            },
          },
          {
            score: 1,
            id: 'test1',
            references: [],
            type: 'cases',
            attributes: {
              owner: 'observability',
              statuses: [builtIn('open'), builtIn('in-progress'), builtIn('closed')],
            },
          },
        ],
        per_page: 5,
        page: 1,
        aggregations: { closureType: { buckets: [] } },
      });

      const res = await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(res.all.customStatuses).toEqual({
        configurations: 1,
        statuses: { open: 0, inProgress: 2, closed: 1 },
        pausing: {
          configurations: 0,
          statuses: { open: 0, inProgress: 0, closed: 0 },
          customizedReasons: 0,
        },
      });
    });

    it('returns correct res with securitySolution customFields', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 5,
        saved_objects: [
          {
            score: 1,
            id: 'test',
            references: [],
            type: 'cases',
            attributes: {
              owner: 'securitySolution',
              customFields: customFieldsMock,
            },
          },
        ],
        per_page: 5,
        page: 1,
        aggregations: {
          closureType: {
            buckets: [
              { doc_count: 1, key: 'close-by-user' },
              { doc_count: 2, key: 'close-by-pushing' },
            ],
          },
        },
      });

      const res = await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res).toEqual({
        all: {
          closure: {
            manually: 1,
            automatic: 2,
          },
          customFields: {
            totals: 4,
            required: 3,
            totalsByType: {
              text: 1,
              toggle: 2,
              foo: 1,
            },
          },
          ...emptyCustomStatusesMock,
        },
        sec: {
          customFields: {
            totals: 4,
            required: 3,
            totalsByType: {
              text: 1,
              toggle: 2,
              foo: 1,
            },
          },
        },
        obs: { ...emptyCustomFieldsMock },
        main: { ...emptyCustomFieldsMock },
      });
    });
  });
});
