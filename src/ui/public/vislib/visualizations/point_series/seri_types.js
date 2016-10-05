import VislibVisualizationsColumnChartProvider from 'ui/vislib/visualizations/point_series/column_chart';
import VislibVisualizationsLineChartProvider from 'ui/vislib/visualizations/point_series/line_chart';
import VislibVisualizationsAreaChartProvider from 'ui/vislib/visualizations/point_series/area_chart';

export default function SeriTypeFactory(Private) {

  return {
    histogram: Private(VislibVisualizationsColumnChartProvider),
    line: Private(VislibVisualizationsLineChartProvider),
    area: Private(VislibVisualizationsAreaChartProvider)
  };
};
