import { z } from 'zod';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { LensConfigBuilder, LensConfig, LensDataset, LensXYConfig, LensPieConfig, LensMetricConfig, LensGaugeConfig, LensHeatmapConfig, LensMosaicConfig, LensRegionMapConfig, LensTableConfig, LensTagCloudConfig, LensTreeMapConfig, LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { getESQLQueryColumns } from '@kbn/esql-ast';
import { dataService } from '@kbn/data-plugin/public';
import { convertSchemaToObservabilityParameters } from '../../common/schema_adapters';

const chartTypes = [
  'bar',
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

const schema = z.object({
  esql: z.object({
    query: z
      .string()
      .describe(
        'The ES|QL query for this visualization. Use the "query" function to generate ES|QL first and then add it here.'
      ),
  }),
  type: z.enum(chartTypes as unknown as [string, ...string[]]).describe('The type of chart'),
  layers: z
    .object({
      xy: z
        .object({
          xAxis: z.string(),
          yAxis: z.string(),
          type: z.enum(['line', 'bar', 'area']),
        })
        .optional(),
      donut: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      metric: z.object({}).optional(),
      gauge: z.object({}).optional(),
      pie: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      heatmap: z
        .object({
          xAxis: z.string(),
          breakdown: z.string(),
        })
        .optional(),
      mosaic: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      regionmap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      table: z.object({}).optional(),
      tagcloud: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      treemap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
    })
    .optional(),
  title: z.string().describe('An optional title for the visualization.').optional(),
});

const NO_ACTIONS = [];
const executeAddToDashboard =
  (dependencies: { dashboardApi: DashboardApi | undefined }) =>
  async ({ args, signal }: { args: z.infer<typeof schema>; signal: AbortSignal }) => {
    const { dashboardApi } = dependencies;
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

export const addToDashboardTool: OneChatToolWithClientCallback<AddToDashboardClientToolDependencies> = {
  toolId: '.add_to_dashboard',
  name: 'add_to_dashboard',
  description:
    'Add an ES|QL visualization to the current dashboard. Pick a single chart type, and based on the chart type, the corresponding key for `layers`. E.g., when you select type:metric, fill in only layers.metric.',
  schema,
  parameters: convertSchemaToObservabilityParameters(schema),
  screenDescription:
    'The user is looking at the dashboard app. Here they can add visualizations to a dashboard and save them',
  handler: async ({ indexPattern }, { modelProvider, esClient }) => {
    // const indices = await esClient.asCurrentUser.cat.indices({ index: indexPattern });

    // const model = await modelProvider.getDefaultModel();
    // const response = await model.inferenceClient.chatComplete(somethingWith(indices));

    // return response;
    return [];
  },
  getPreToolClientActions: async (dependencies: AddToDashboardClientToolDependencies) => {
    if (!dependencies.dashboardApi) {
      return NO_ACTIONS;
    }
    return [executeAddToDashboard(dependencies)];
  },
  getPostToolClientActions: async (dependencies: AddToDashboardClientToolDependencies) => {
    if (!dependencies.dashboardApi) {
      return NO_ACTIONS;
    }
    return [executeAddToDashboard(dependencies)];
  },
};
