import _ from 'lodash';
import BoundToConfigObjProvider from 'ui/bound_to_config_obj';
import StringifyTypesNumeralProvider from 'ui/stringify/types/_numeral';
export default function PercentFormatProvider(Private) {
  let BoundToConfigObj = Private(BoundToConfigObjProvider);
  let Numeral = Private(StringifyTypesNumeralProvider);

  return Numeral.factory({
    id: 'percent',
    title: 'Percentage',
    paramDefaults: new BoundToConfigObj({
      pattern: '=format:percent:defaultPattern',
      fractional: true
    }),
    sampleInputs: [
      0.10, 0.99999, 1, 100, 1000
    ],
    prototype: {
      _convert: _.compose(Numeral.prototype._convert, function (val) {
        return this.param('fractional') ? val : val / 100;
      })
    }
  });
};
