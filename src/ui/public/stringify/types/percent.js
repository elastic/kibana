import _ from 'lodash';
import { Numeral } from 'ui/stringify/types/_numeral';

export function stringifyPercent() {
  return Numeral.factory({
    id: 'percent',
    title: 'Percentage',
    getParamDefaults: (getConfig) => {
      return {
        pattern: getConfig('format:percent:defaultPattern'),
        fractional: true
      };
    },
    sampleInputs: [
      0.10, 0.99999, 1, 100, 1000
    ],
    prototype: {
      _convert: _.compose(Numeral.prototype._convert, function (val) {
        return this.param('fractional') ? val : val / 100;
      })
    }
  });
}
