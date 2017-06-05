import _ from 'lodash';
import expect from 'expect.js';
import { parseRange } from 'ui/utils/range';

describe('Range parsing utility', function () {

  it('throws an error for inputs that are not formatted properly', function () {
    expect(function () {
      parseRange('');
    }).to.throwException(TypeError);

    expect(function () {
      parseRange('p10202');
    }).to.throwException(TypeError);

    expect(function () {
      parseRange('{0,100}');
    }).to.throwException(TypeError);

    expect(function () {
      parseRange('[0,100');
    }).to.throwException(TypeError);

    expect(function () {
      parseRange(')0,100(');
    }).to.throwException(TypeError);
  });

  const tests = {
    '[ 0 , 100 ]': {
      props: {
        min: 0,
        max: 100,
        minInclusive: true,
        maxInclusive: true
      },
      within: [
        [0, true],
        [0.0000001, true],
        [1, true],
        [99.99999, true],
        [100, true]
      ]
    },
    '(26.3   ,   42]': {
      props: {
        min: 26.3,
        max: 42,
        minInclusive: false,
        maxInclusive: true
      },
      within: [
        [26.2999999, false],
        [26.3000001, true],
        [30, true],
        [41, true],
        [42, true]
      ]
    },
    '(-50,50)': {
      props: {
        min: -50,
        max: 50,
        minInclusive: false,
        maxInclusive: false
      },
      within: [
        [-50, false],
        [-49.99999, true],
        [0, true],
        [49.99999, true],
        [50, false]
      ]
    },
    '(Infinity, -Infinity)': {
      props: {
        min: -Infinity,
        max: Infinity,
        minInclusive: false,
        maxInclusive: false
      },
      within: [
        [0, true],
        [-0.0000001, true],
        [-1, true],
        [-10000000000, true],
        [-Infinity, false],
        [Infinity, false],
      ]
    }
  };

  _.forOwn(tests, function (spec, str) {

    describe(str, function () {
      const range = parseRange(str);

      it('creation', function () {
        expect(range).to.eql(spec.props);
      });

      spec.within.forEach(function (tup) {
        it('#within(' + tup[0] + ')', function () {
          expect(range.within(tup[0])).to.be(tup[1]);
        });
      });
    });

  });
});
