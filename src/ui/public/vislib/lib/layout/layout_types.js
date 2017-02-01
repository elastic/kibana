import VislibLibLayoutTypesColumnLayoutProvider from './types/column_layout';
import VislibLibLayoutTypesPieLayoutProvider from './types/pie_layout';

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
    pie: Private(VislibLibLayoutTypesPieLayoutProvider),
    point_series: Private(VislibLibLayoutTypesColumnLayoutProvider)
  };
}
