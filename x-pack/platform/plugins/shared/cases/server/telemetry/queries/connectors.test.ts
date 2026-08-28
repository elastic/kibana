/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CONNECTOR_TELEMETRY_MAPPING, getConnectorsTelemetryData } from './connectors';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('getConnectorsTelemetryData', () => {
  describe('getConnectorsTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const mockFind = (aggs: Record<string, unknown>) => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 5,
        saved_objects: [],
        per_page: 1,
        page: 1,
        aggregations: {
          ...aggs,
        },
      });
    };

    const ALL_CONNECTORS_TOTAL = 1;
    const MAX_ATTACHED = 2;
    const FIRST_CONNECTOR_VALUE = 3;

    const mockResponse = () => {
      mockFind({
        references: { referenceType: { referenceAgg: { value: ALL_CONNECTORS_TOTAL } } },
      });
      mockFind({ references: { cases: { max: { value: MAX_ATTACHED } } } });
      Object.values(CONNECTOR_TELEMETRY_MAPPING).forEach((_, index) => {
        mockFind({
          references: { referenceType: { referenceAgg: { value: FIRST_CONNECTOR_VALUE + index } } },
        });
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      mockResponse();

      const res = await getConnectorsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      const expectedPerConnector = Object.fromEntries(
        Object.values(CONNECTOR_TELEMETRY_MAPPING).map((name, index) => [
          name,
          { totalAttached: FIRST_CONNECTOR_VALUE + index },
        ])
      );

      expect(res).toEqual({
        all: {
          all: { totalAttached: ALL_CONNECTORS_TOTAL },
          maxAttachedToACase: MAX_ATTACHED,
          ...expectedPerConnector,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      mockResponse();

      await getConnectorsTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger });

      expect(savedObjectsClient.find.mock.calls[0][0]).toEqual({
        aggs: {
          references: {
            aggregations: {
              referenceType: {
                aggregations: {
                  referenceAgg: {
                    cardinality: {
                      field: 'cases-user-actions.references.id',
                    },
                  },
                },
                filter: {
                  term: {
                    'cases-user-actions.references.type': 'action',
                  },
                },
              },
            },
            nested: {
              path: 'cases-user-actions.references',
            },
          },
        },
        filter: undefined,
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
        namespaces: ['*'],
      });

      expect(savedObjectsClient.find.mock.calls[1][0]).toEqual({
        aggs: {
          references: {
            aggregations: {
              cases: {
                aggregations: {
                  ids: {
                    terms: {
                      field: 'cases-user-actions.references.id',
                    },
                  },
                  max: {
                    max_bucket: {
                      buckets_path: 'ids._count',
                    },
                  },
                },
                filter: {
                  term: {
                    'cases-user-actions.references.type': 'cases',
                  },
                },
              },
            },
            nested: {
              path: 'cases-user-actions.references',
            },
          },
        },
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'cases-user-actions.attributes.type',
              isQuoted: false,
            },
            {
              type: 'literal',
              value: 'connector',
              isQuoted: false,
            },
          ],
          function: 'is',
          type: 'function',
        },
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
        namespaces: ['*'],
      });

      for (const [index, connector] of Object.keys(CONNECTOR_TELEMETRY_MAPPING).entries()) {
        const callIndex = index + 2;

        expect(savedObjectsClient.find.mock.calls[callIndex][0]).toEqual({
          aggs: {
            references: {
              aggregations: {
                referenceType: {
                  aggregations: {
                    referenceAgg: {
                      cardinality: {
                        field: 'cases-user-actions.references.id',
                      },
                    },
                  },
                  filter: {
                    term: {
                      'cases-user-actions.references.type': 'action',
                    },
                  },
                },
              },
              nested: {
                path: 'cases-user-actions.references',
              },
            },
          },
          filter: {
            arguments: [
              {
                type: 'literal',
                value: 'cases-user-actions.attributes.payload.connector.type',
                isQuoted: false,
              },
              {
                type: 'literal',
                value: connector,
                isQuoted: false,
              },
            ],
            function: 'is',
            type: 'function',
          },
          page: 0,
          perPage: 0,
          type: 'cases-user-actions',
          namespaces: ['*'],
        });
      }
    });
  });
});
