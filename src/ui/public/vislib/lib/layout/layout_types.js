import { VislibLibLayoutTypesColumnLayoutProvider } from './types/column_layout';
import { VislibLibLayoutTypesPieLayoutProvider } from './types/pie_layout';
import { GaugeLayoutProvider } from './types/gauge_layout';

export function VislibLibLayoutLayoutTypesProvider(Private) {

  /**
   * Provides the HTML layouts for each visualization class
   *
   * @module vislib
   * @submodule LayoutTypeFactory
   * @param Private {Service} Loads any function as an angular module
   * @return {Function} Returns an Object of HTML layouts for each visualization class
   */
  return {
    pie: Private(VislibLibLayoutTypesPieLayoutProvider),
    gauge: Private(GaugeLayoutProvider),
    goal: Private(GaugeLayoutProvider),
    metric: Private(GaugeLayoutProvider),
    point_series: Private(VislibLibLayoutTypesColumnLayoutProvider)
  };
}
