import _ from 'lodash';
import { ordinalSuffix } from 'ui/utils/ordinal_suffix';
import expect from 'expect.js';

describe('ordinal suffix util', function () {
  const checks = {
    1: 'st',
    2: 'nd',
    3: 'rd',
    4: 'th',
    5: 'th',
    6: 'th',
    7: 'th',
    8: 'th',
    9: 'th',
    10: 'th',
    11: 'th',
    12: 'th',
    13: 'th',
    14: 'th',
    15: 'th',
    16: 'th',
    17: 'th',
    18: 'th',
    19: 'th',
    20: 'th',
    21: 'st',
    22: 'nd',
    23: 'rd',
    24: 'th',
    25: 'th',
    26: 'th',
    27: 'th',
    28: 'th',
    29: 'th',
    30: 'th'
  };

  _.forOwn(checks, function (expected, num) {
    const int = parseInt(num, 10);
    const float = int + Math.random();

    it('knowns ' + int, function () {
      expect(ordinalSuffix(num)).to.be(num + '' + expected);
    });

    it('knows ' + float, function () {
      expect(ordinalSuffix(num)).to.be(num + '' + expected);
    });
  });
});
