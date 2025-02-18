/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TransformGetTransformResponse,
  TransformGetTransformStatsResponse,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import type { FindResult, RulesClient } from '@kbn/alerting-plugin/server';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { transformHealthServiceProvider } from './transform_health_service';
import type { TransformHealthRuleParams } from '@kbn/response-ops-rule-params/transform_health';

describe('transformHealthServiceProvider', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let rulesClient: jest.Mocked<RulesClient>;
  let fieldFormatsRegistry: jest.Mocked<FieldFormatsRegistry>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    (esClient.transform.getTransform as jest.Mock).mockImplementation(
      async ({ transform_id: transformId }) => {
        return {
          transforms: [
            // Mock continuous transforms
            ...new Array(102).fill(null).map((_, i) => ({
              id: `transform${i}`,
              sync: {
                time: {
                  field: 'order_date',
                  delay: '60s',
                },
              },
            })),
            {
              id: 'transform102',
            },
          ],
        } as unknown as TransformGetTransformResponse;
      }
    );

    (esClient.transform.getTransformStats as jest.Mock).mockResolvedValue({
      count: 2,
      transforms: [{}],
    } as unknown as TransformGetTransformStatsResponse);

    rulesClient = rulesClientMock.create();
    fieldFormatsRegistry = {
      deserialize: jest.fn(),
    } as unknown as jest.Mocked<FieldFormatsRegistry>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch transform stats by transform IDs if the length does not exceed the URL limit', async () => {
    const service = transformHealthServiceProvider({ esClient, rulesClient, fieldFormatsRegistry });
    const result = await service.getHealthChecksResults(
      {
        includeTransforms: ['*'],
        excludeTransforms: ['transform4', 'transform6', 'transform6*'],
        testsConfig: null,
      },
      {}
    );

    expect(esClient.transform.getTransform).toHaveBeenCalledTimes(1);

    expect(esClient.transform.getTransform).toHaveBeenCalledWith({
      allow_no_match: true,
      size: 1000,
    });

    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(1, {
      basic: true,
      transform_id:
        'transform0,transform1,transform2,transform3,transform5,transform7,transform8,transform9,transform10,transform11,transform12,transform13,transform14,transform15,transform16,transform17,transform18,transform19,transform20,transform21,transform22,transform23,transform24,transform25,transform26,transform27,transform28,transform29,transform30,transform31,transform32,transform33,transform34,transform35,transform36,transform37,transform38,transform39,transform40,transform41,transform42,transform43,transform44,transform45,transform46,transform47,transform48,transform49,transform50,transform51,transform52,transform53,transform54,transform55,transform56,transform57,transform58,transform59,transform70,transform71,transform72,transform73,transform74,transform75,transform76,transform77,transform78,transform79,transform80,transform81,transform82,transform83,transform84,transform85,transform86,transform87,transform88,transform89,transform90,transform91,transform92,transform93,transform94,transform95,transform96,transform97,transform98,transform99,transform100,transform101',
      size: 90,
    });

    expect(result).toBeDefined();
  });

  it('should fetch all transform stats and filter by transform IDs if the length exceeds the URL limit', async () => {
    const transformIdPrefix = 'transform_with_a_very_long_id_that_result_in_long_url_for_sure_';

    (esClient.transform.getTransform as jest.Mock).mockResolvedValue({
      count: 3,
      transforms: [
        // Mock continuous transforms
        ...new Array(102).fill(null).map((_, i) => ({
          id: `${transformIdPrefix}${i}`,
          sync: true,
        })),
        {
          id: 'transform102',
          sync: false,
        },
      ],
    } as unknown as TransformGetTransformResponse);

    (esClient.transform.getTransformStats as jest.Mock).mockResolvedValue({
      count: 2,
      transforms: [
        ...new Array(200).fill(null).map((_, i) => ({
          id: `${transformIdPrefix}${i}`,
          transform_state: 'stopped',
        })),
      ],
    } as unknown as TransformGetTransformStatsResponse);

    const service = transformHealthServiceProvider({ esClient, rulesClient, fieldFormatsRegistry });
    const result = await service.getHealthChecksResults(
      {
        includeTransforms: ['*'],
        excludeTransforms: new Array(50).fill(null).map((_, i) => `${transformIdPrefix}${i + 60}`),
        testsConfig: null,
      },
      {}
    );

    expect(esClient.transform.getTransform).toHaveBeenCalledWith({
      allow_no_match: true,
      size: 1000,
    });
    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(1, {
      basic: true,
      transform_id: '_all',
      size: 1000,
    });

    const notStarted = result[0];

    expect(notStarted.context.message).toEqual(
      '60 transforms are not started: transform_with_a_very_long_id_that_result_in_long_url_for_sure_0, transform_with_a_very_long_id_that_result_in_long_url_for_sure_1, transform_with_a_very_long_id_that_result_in_long_url_for_sure_2, transform_with_a_very_long_id_that_result_in_long_url_for_sure_3, transform_with_a_very_long_id_that_result_in_long_url_for_sure_4, transform_with_a_very_long_id_that_result_in_long_url_for_sure_5, transform_with_a_very_long_id_that_result_in_long_url_for_sure_6, transform_with_a_very_long_id_that_result_in_long_url_for_sure_7, transform_with_a_very_long_id_that_result_in_long_url_for_sure_8, transform_with_a_very_long_id_that_result_in_long_url_for_sure_9 and 50 others.'
    );
  });

  it('should mention recovered transforms based on the previous state', async () => {
    const service = transformHealthServiceProvider({ esClient, rulesClient, fieldFormatsRegistry });

    (esClient.transform.getTransformStats as jest.Mock).mockResolvedValue({
      count: 2,
      transforms: [
        {
          id: 'transform1',
          state: 'started',
        },
        {
          id: 'transform2',
          state: 'started',
        },
      ],
    } as unknown as TransformGetTransformStatsResponse);

    const result = await service.getHealthChecksResults(
      {
        includeTransforms: ['*'],
        excludeTransforms: ['transform4', 'transform6', 'transform6*'],
        testsConfig: {
          notStarted: {
            enabled: true,
          },
          healthCheck: {
            enabled: false,
          },
          errorMessages: {
            enabled: false,
          },
        },
      },
      {
        notStarted: ['transform1', 'transform2'],
        unhealthy: ['transform3'],
      }
    );

    expect(result[0].context.message).toEqual('2 transforms are started: transform1, transform2.');
  });

  it('should work without previous execution state', async () => {
    const service = transformHealthServiceProvider({ esClient, rulesClient, fieldFormatsRegistry });

    (esClient.transform.getTransformStats as jest.Mock).mockResolvedValue({
      count: 2,
      transforms: [
        {
          id: 'transform1',
          state: 'started',
        },
        {
          id: 'transform2',
          state: 'started',
        },
      ],
    } as unknown as TransformGetTransformStatsResponse);

    const result = await service.getHealthChecksResults(
      {
        includeTransforms: ['*'],
        excludeTransforms: ['transform4', 'transform6', 'transform6*'],
        testsConfig: {
          notStarted: {
            enabled: true,
          },
          healthCheck: {
            enabled: false,
          },
          errorMessages: {
            enabled: false,
          },
        },
      },
      {}
    );

    expect(result[0].context.message).toEqual('All transforms are started.');
  });

  describe('populateTransformsWithAssignedRules', () => {
    it('should throw an error if rulesClient is missing', async () => {
      const service = transformHealthServiceProvider({ esClient, fieldFormatsRegistry });

      await expect(service.populateTransformsWithAssignedRules([])).rejects.toThrow(
        'Rules client is missing'
      );
    });

    it('should return an empty list if no transforms are provided', async () => {
      const service = transformHealthServiceProvider({
        esClient,
        rulesClient,
        fieldFormatsRegistry,
      });

      const result = await service.populateTransformsWithAssignedRules([]);
      expect(result).toEqual([]);
    });

    it('should return transforms with associated alerting rules', async () => {
      const transforms = [
        { id: 'transform1', sync: {} },
        { id: 'transform2', sync: {} },
        { id: 'transform3', sync: {} },
      ] as TransformGetTransformTransformSummary[];

      const rules = [
        {
          id: 'rule1',
          params: {
            includeTransforms: ['transform1', 'transform2'],
            excludeTransforms: [],
          },
        },
        {
          id: 'rule2',
          params: {
            includeTransforms: ['transform3'],
            excludeTransforms: null,
          },
        },
      ];

      rulesClient.find.mockResolvedValue({ data: rules } as FindResult<TransformHealthRuleParams>);

      const service = transformHealthServiceProvider({
        esClient,
        rulesClient,
        fieldFormatsRegistry,
      });

      const result = await service.populateTransformsWithAssignedRules(transforms);

      expect(result).toEqual([
        {
          id: 'transform1',
          sync: {},
          alerting_rules: [rules[0]],
        },
        {
          id: 'transform2',
          sync: {},
          alerting_rules: [rules[0]],
        },
        {
          id: 'transform3',
          sync: {},
          alerting_rules: [rules[1]],
        },
      ]);
    });

    it('should exclude transforms based on excludeTransforms parameter', async () => {
      const transforms = [
        { id: 'transform1', sync: {} },
        { id: 'transform2', sync: {} },
        { id: 'transform3', sync: {} },
      ] as TransformGetTransformTransformSummary[];

      const rules = [
        {
          id: 'rule1',
          params: {
            includeTransforms: ['transform*'],
            excludeTransforms: ['transform2'],
          },
        },
        {
          id: 'rule2',
          params: {
            includeTransforms: ['*'],
            excludeTransforms: [],
          },
        },
      ];

      rulesClient.find.mockResolvedValue({ data: rules } as FindResult<TransformHealthRuleParams>);

      const service = transformHealthServiceProvider({
        esClient,
        rulesClient,
        fieldFormatsRegistry,
      });

      const result = await service.populateTransformsWithAssignedRules(transforms);

      expect(result).toEqual([
        {
          id: 'transform1',
          sync: {},
          alerting_rules: [rules[0], rules[1]],
        },
        {
          id: 'transform2',
          sync: {},
          alerting_rules: [rules[1]],
        },
        {
          id: 'transform3',
          sync: {},
          alerting_rules: [rules[0], rules[1]],
        },
      ]);
    });
  });
});
