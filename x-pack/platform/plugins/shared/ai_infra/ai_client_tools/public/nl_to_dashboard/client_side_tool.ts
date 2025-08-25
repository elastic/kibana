/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type {
  LensConfig,
  LensDataset,
  LensXYConfig,
  LensPieConfig,
  LensMetricConfig,
  LensGaugeConfig,
  LensHeatmapConfig,
  LensMosaicConfig,
  LensRegionMapConfig,
  LensTableConfig,
  LensTagCloudConfig,
  LensTreeMapConfig,
  LensEmbeddableInput,
} from '@kbn/lens-plugin/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { OneChatToolWithClientCallback } from '../../common/types';
import { convertSchemaToObservabilityParameters } from '../../common/schema_adapters';
import { schema, addToDashboardServerSideTool } from '../../common/onechat_server_tool';

const NO_ACTIONS = [];
const executeAddToDashboard =
  (dependencies: { dashboardApi: DashboardApi | undefined }) =>
  async ({ args, signal }: { args: z.infer<typeof schema>; signal: AbortSignal }) => {
    const { dashboardApi, dataService } = dependencies;
    const {
      title = '',
      type: chartType = 'xy',
      layers,
      esql: { query },
    } = args;

    const [columns] = await Promise.all([
      getESQLQueryColumns({
        esqlQuery: query,
        search: dataService.search.search,
        signal,
      }),
    ]);

    const configBuilder = new LensConfigBuilder(dataService.dataViews);

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
              xAxis: layers?.xy?.xAxis,
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

    return dashboardApi
      .addNewPanel({
        panelType: 'lens',
        serializedState: {
          rawState: { ...embeddableInput },
        },
      })
      .then(() => {
        return {
          content: 'Visualization successfully added to dashboard',
        };
      })
      .catch((error) => {
        return {
          content: {
            error,
          },
        };
      });
  };

interface AddToDashboardClientToolDependencies {
  dashboardApi: DashboardApi | undefined;
}

export const addToDashboardTool: OneChatToolWithClientCallback<AddToDashboardClientToolDependencies> =
  {
    ...addToDashboardServerSideTool,
    tags: ['dashboard'],
    parameters: convertSchemaToObservabilityParameters(schema),
    getPreToolClientActions: async (dependencies: AddToDashboardClientToolDependencies) => {},
    getPostToolClientActions: async (dependencies: AddToDashboardClientToolDependencies) => {
      if (!dependencies.dashboardApi) {
        return NO_ACTIONS;
      }
      return [executeAddToDashboard(dependencies)];
    },
  };
