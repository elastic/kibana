import { VislibVisualizationsColumnChartProvider } from './column_chart';
import { VislibVisualizationsLineChartProvider } from './line_chart';
import { VislibVisualizationsAreaChartProvider } from './area_chart';
import { VislibVisualizationsHeatmapChartProvider } from './heatmap_chart';

export function VislibVisualizationsSeriesTypesProvider(Private) {

  return {
    histogram: Private(VislibVisualizationsColumnChartProvider),
    line: Private(VislibVisualizationsLineChartProvider),
    area: Private(VislibVisualizationsAreaChartProvider),
    heatmap: Private(VislibVisualizationsHeatmapChartProvider)
  };
}
