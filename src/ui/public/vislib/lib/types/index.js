import VislibLibTypesPointSeriesProvider from 'ui/vislib/lib/types/point_series';
import VislibLibTypesPieProvider from 'ui/vislib/lib/types/pie';
import VislibLibTypesTileMapProvider from 'ui/vislib/lib/types/tile_map';

export default function TypeFactory(Private) {
  const pointSeries = Private(VislibLibTypesPointSeriesProvider);

  /**
   * Handles the building of each visualization
   *
   * @return {Function} Returns an Object of Handler types
   */
  return {
    histogram: pointSeries.column,
    line: pointSeries.line,
    pie: Private(VislibLibTypesPieProvider),
    area: pointSeries.area,
    tile_map: Private(VislibLibTypesTileMapProvider),
    point_series: pointSeries.line
  };
};
