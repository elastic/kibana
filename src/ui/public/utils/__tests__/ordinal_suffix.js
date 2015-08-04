var _ = require('lodash');
var addOrdinalSuffix = require('ui/utils/ordinal_suffix');
var expect = require('expect.js');

describe('ordinal suffix util', function () {
  var checks = {
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
    var int = parseInt(num, 10);
    var float = int + Math.random();

    it('knowns ' + int, function () {
      expect(addOrdinalSuffix(num)).to.be(num + '' + expected);
    });

    it('knows ' + float, function () {
      expect(addOrdinalSuffix(num)).to.be(num + '' + expected);
    });
  });
});
