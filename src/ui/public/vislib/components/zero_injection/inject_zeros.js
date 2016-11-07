import _ from 'lodash';
import VislibComponentsZeroInjectionZeroFilledArrayProvider from 'ui/vislib/components/zero_injection/zero_filled_array';
import VislibComponentsZeroInjectionZeroFillDataArrayProvider from 'ui/vislib/components/zero_injection/zero_fill_data_array';
export default function ZeroInjectionUtilService(Private) {

  const createZeroFilledArray = Private(VislibComponentsZeroInjectionZeroFilledArrayProvider);
  const zeroFillDataArray = Private(VislibComponentsZeroInjectionZeroFillDataArrayProvider);

  /*
   * A Kibana data object may have multiple series with different array lengths.
   * This proves an impediment to stacking in the visualization library.
   * Therefore, zero values must be injected wherever these arrays do not line up.
   * That is, each array must have the same x values with zeros filled in where the
   * x values were added.
   *
   * This function and its helper functions accepts a Kibana data object
   * and injects zeros where needed.
   */

  return function (obj) {
    const keys = _(obj).map('values').flatten().map('x').uniq().sort().value();//orderXValues(obj);

    obj.forEach(function (series) {
      const zeroArray = createZeroFilledArray(keys, series.label);
      series.values = zeroFillDataArray(zeroArray, series.values);
    });

    return obj;
  };
};
