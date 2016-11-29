import VislibLibHandlerTypesPointSeriesProvider from 'ui/vislib/lib/handler/types/point_series';
import VislibLibHandlerTypesPieProvider from 'ui/vislib/lib/handler/types/pie';
import VislibLibHandlerTypesTileMapProvider from 'ui/vislib/lib/handler/types/tile_map';

export default function HandlerTypeFactory(Private) {
  const pointSeries = Private(VislibLibHandlerTypesPointSeriesProvider);

  /**
   * Handles the building of each visualization
   *
   * @return {Function} Returns an Object of Handler types
   */
  return {
    histogram: pointSeries.column,
    line: pointSeries.line,
    pie: Private(VislibLibHandlerTypesPieProvider),
    area: pointSeries.area,
    tile_map: Private(VislibLibHandlerTypesTileMapProvider)
  };
};
