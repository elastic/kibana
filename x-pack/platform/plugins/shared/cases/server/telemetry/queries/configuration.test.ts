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
        extractObservables: {
          buckets: [
            { doc_count: 3, key: 1 },
            { doc_count: 2, key: 0 },
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
          extractObservablesDefaultOn: 3,
          extractObservablesDefaultOff: 2,
          ...emptyCustomFieldsMock,
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
          extractObservables: {
            terms: {
              field: 'cases-configure.attributes.extractObservables',
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
          extractObservables: {
            buckets: [
              { doc_count: 3, key: 1 },
              { doc_count: 2, key: 0 },
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
          extractObservablesDefaultOn: 3,
          extractObservablesDefaultOff: 2,
          customFields: {
            totals: 8,
            required: 6,
            totalsByType: {
              text: 2,
              toggle: 4,
              foo: 2,
            },
          },
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
          extractObservables: {
            buckets: [
              { doc_count: 4, key: 1 },
              { doc_count: 1, key: 0 },
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
          extractObservablesDefaultOn: 4,
          extractObservablesDefaultOff: 1,
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

    it('counts extractObservables: true as defaultOn', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 3,
        saved_objects: [],
        per_page: 5,
        page: 1,
        aggregations: {
          closureType: { buckets: [] },
          extractObservables: {
            buckets: [{ doc_count: 3, key: 1 }],
          },
        },
      });

      const res = await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res.all.extractObservablesDefaultOn).toBe(3);
      expect(res.all.extractObservablesDefaultOff).toBe(0);
    });

    it('counts extractObservables: false as defaultOff', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 2,
        saved_objects: [],
        per_page: 5,
        page: 1,
        aggregations: {
          closureType: { buckets: [] },
          extractObservables: {
            buckets: [{ doc_count: 2, key: 0 }],
          },
        },
      });

      const res = await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res.all.extractObservablesDefaultOn).toBe(0);
      expect(res.all.extractObservablesDefaultOff).toBe(2);
    });

    it('treats old SOs without extractObservables as defaultOn', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 4,
        saved_objects: [],
        per_page: 5,
        page: 1,
        aggregations: {
          closureType: { buckets: [] },
          extractObservables: {
            buckets: [{ doc_count: 1, key: 0 }],
          },
        },
      });

      const res = await getConfigurationTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res.all.extractObservablesDefaultOn).toBe(3);
      expect(res.all.extractObservablesDefaultOff).toBe(1);
    });
  });
});
