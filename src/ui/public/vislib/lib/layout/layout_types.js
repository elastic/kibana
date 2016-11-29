import VislibLibLayoutTypesColumnLayoutProvider from 'ui/vislib/lib/layout/types/column_layout';
import VislibLibLayoutTypesPieLayoutProvider from 'ui/vislib/lib/layout/types/pie_layout';
import VislibLibLayoutTypesMapLayoutProvider from 'ui/vislib/lib/layout/types/map_layout';

export default function LayoutTypeFactory(Private) {

  /**
   * Provides the HTML layouts for each visualization class
   *
   * @module vislib
   * @submodule LayoutTypeFactory
   * @param Private {Service} Loads any function as an angular module
   * @return {Function} Returns an Object of HTML layouts for each visualization class
   */
  return {
    histogram: Private(VislibLibLayoutTypesColumnLayoutProvider),
    line: Private(VislibLibLayoutTypesColumnLayoutProvider),
    area: Private(VislibLibLayoutTypesColumnLayoutProvider),
    pie: Private(VislibLibLayoutTypesPieLayoutProvider),
    tile_map: Private(VislibLibLayoutTypesMapLayoutProvider)
  };
};
