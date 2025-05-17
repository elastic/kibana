/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolCallsOf, ToolDefinition } from '@kbn/inference-common';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { ElasticsearchClient } from '@kbn/core/server';
import { defer, from } from 'rxjs';
import { ESQLSearchResponse } from '@kbn/es-types';
import { IKibanaSearchResponse } from '@kbn/search-types';
import {
  LensConfigBuilder,
  LensDataset,
  type LensConfig,
  type LensGaugeConfig,
  type LensHeatmapConfig,
  type LensMetricConfig,
  type LensMosaicConfig,
  type LensPieConfig,
  type LensRegionMapConfig,
  type LensTableConfig,
  type LensTagCloudConfig,
  type LensTreeMapConfig,
  type LensXYConfig,
  DataViewsCommon,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';

export const CREATE_PANEL_TOOL_NAME = 'create_panel';

const chartTypes = [
  'xy',
  'pie',
  'heatmap',
  'metric',
  'gauge',
  'donut',
  'mosaic',
  'regionmap',
  'table',
  'tagcloud',
  'treemap',
] as const;

const createPanelTool = {
  description: 'Create a Lens panel using ES|QL',
  schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'The type of chart',
        enum: chartTypes,
      },
      id: {
        type: 'string',
      },
      title: {
        type: 'string',
      },
      description: {
        type: 'string',
      },
      query: {
        type: 'object',
        properties: {
          esql: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
              },
            },
            required: ['query'],
          },
        },
        required: ['esql'],
      },
      layers: {
        type: 'object',
        properties: {
          xy: {
            type: 'object',
            properties: {
              xAxis: {
                type: 'string',
              },
              yAxis: {
                type: 'string',
              },
              type: {
                type: 'string',
                enum: ['line', 'bar', 'area'],
              },
            },
          },
          donut: {
            type: 'object',
            properties: {
              breakdown: {
                type: 'string',
              },
            },
          },
          metric: {
            type: 'object',
            properties: {},
          },
          gauge: {
            type: 'object',
            properties: {},
          },
          pie: {
            type: 'object',
            properties: {
              breakdown: {
                type: 'string',
              },
            },
          },
          heatmap: {
            type: 'object',
            properties: {
              xAxis: {
                type: 'string',
              },
              breakdown: {
                type: 'string',
              },
            },
            required: ['xAxis'],
          },
          mosaic: {
            type: 'object',
            properties: {
              breakdown: {
                type: 'string',
              },
            },
            required: ['breakdown'],
          },
          regionmap: {
            type: 'object',
            properties: {
              breakdown: {
                type: 'string',
              },
            },
            required: ['breakdown'],
          },
          table: {
            type: 'object',
            properties: {},
          },
          tagcloud: {
            type: 'object',
            properties: {
              breakdown: {
                type: 'string',
              },
            },
            required: ['breakdown'],
          },
          treemap: {
            type: 'object',
            properties: {
              breakdown: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    required: ['query', 'layers', 'type', 'id', 'title'],
  },
} as const satisfies ToolDefinition;

export async function getCreatePanelTool({
  esClient,
  dataViews,
}: {
  esClient: ElasticsearchClient;
  dataViews: DataViewsCommon;
}) {
  return {
    name: CREATE_PANEL_TOOL_NAME,
    ...createPanelTool,
    callback: async (
      callback: ToolCallsOf<{
        tools: { [CREATE_PANEL_TOOL_NAME]: typeof createPanelTool };
      }>['toolCalls'][number],
      {
        signal,
      }: {
        signal: AbortSignal;
      }
    ) => {
      const {
        title = '',
        type: chartType = 'xy',
        layers,
        query: {
          esql: { query },
        },
      } = callback.function.arguments;

      const [columns] = await Promise.all([
        getESQLQueryColumns({
          esqlQuery: query,
          search: ({ id, params }) => {
            const esqlParams: {
              params?: Array<{ _tstart: string } | { _tend: string }>;
              query: string;
            } = params;

            return defer(() =>
              from(
                esClient.esql
                  .query({
                    query: esqlParams.query,
                    ...(esqlParams.params
                      ? { params: esqlParams.params.map((val) => Object.keys(val)[0]) }
                      : {}),
                    format: 'json',
                  })
                  .then((response): IKibanaSearchResponse<ESQLSearchResponse> => {
                    const res = response as unknown as ESQLSearchResponse;

                    return {
                      id,
                      rawResponse: res,
                    };
                  })
              )
            );
          },
          signal,
        }),
      ]);

      const configBuilder = new LensConfigBuilder(dataViews);

      let config: LensConfig;

      const firstMetricColumn = columns.find((column) => column.meta.type === 'number')?.id;

      const dataset: LensDataset = {
        esql: query,
      };

      switch (chartType) {
        default:
        case 'xy':
          const xyConfig: LensXYConfig = {
            chartType: 'xy',
            layers: [
              {
                seriesType: layers?.xy?.type || 'line',
                type: 'series',
                xAxis: layers?.xy?.xAxis || '@timestamp',
                yAxis: [
                  {
                    value: layers?.xy?.yAxis || firstMetricColumn!,
                  },
                ],
              },
            ],
            dataset,
            title,
          };
          config = xyConfig;
          break;

        case 'donut':
          const donutConfig: LensPieConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            breakdown: [layers?.donut?.breakdown!],
            dataset,
          };
          config = donutConfig;
          break;

        case 'pie':
          const pieConfig: LensPieConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            breakdown: [layers?.pie?.breakdown!],
            dataset,
          };
          config = pieConfig;
          break;

        case 'metric':
          const metricConfig: LensMetricConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            dataset,
          };
          config = metricConfig;
          break;

        case 'gauge':
          const gaugeConfig: LensGaugeConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            dataset,
          };
          config = gaugeConfig;

          break;

        case 'heatmap':
          const heatmapConfig: LensHeatmapConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            breakdown: layers?.heatmap?.breakdown,
            xAxis: layers?.heatmap?.xAxis || '@timestamp',
            dataset,
          };
          config = heatmapConfig;
          break;

        case 'mosaic':
          const mosaicConfig: LensMosaicConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            breakdown: [layers?.mosaic?.breakdown || '@timestamp'],
            dataset,
          };
          config = mosaicConfig;
          break;

        case 'regionmap':
          const regionMapConfig: LensRegionMapConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            breakdown: layers?.regionmap?.breakdown!,
            dataset,
          };
          config = regionMapConfig;
          break;

        case 'table':
          const tableConfig: LensTableConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            dataset,
          };
          config = tableConfig;
          break;

        case 'tagcloud':
          const tagCloudConfig: LensTagCloudConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            breakdown: layers?.tagcloud?.breakdown!,
            dataset,
          };
          config = tagCloudConfig;
          break;

        case 'treemap':
          const treeMapConfig: LensTreeMapConfig = {
            chartType,
            title,
            value: firstMetricColumn!,
            breakdown: [layers?.treemap?.breakdown || '@timestamp'],
            dataset,
          };
          config = treeMapConfig;
          break;
      }

      const embeddableInput = (await configBuilder.build(config, {
        embeddable: true,
        query: dataset,
      })) as LensEmbeddableInput;

      return {
        panelType: 'lens',
        serializedState: {
          rawState: { embeddableInput },
        },
      };
    },
  };
}
