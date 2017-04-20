import _ from 'lodash';
import { sequencer } from 'ui/utils/sequencer';
import expect from 'expect.js';
describe('sequencer util', function () {

  const opts = [
    { min: 500, max: 7500, length: 1500 },
    { min: 50, max: 500, length: 1000 },
    { min: 5, max: 50, length: 100 }
  ];

  function eachSeqFor(method, fn) {
    opts.forEach(function (args) {
      fn(method(args.min, args.max, args.length), args);
    });
  }

  function getSlopes(seq, count) {
    return _.chunk(seq, Math.ceil(seq.length / count)).map(function (chunk) {
      return (_.last(chunk) - _.first(chunk)) / chunk.length;
    });
  }

  // using expect() here causes massive GC runs because seq can be +1000 elements
  function expectedChange(seq, up) {
    up = !!up;

    if (seq.length < 2) {
      throw new Error('unable to reach change without at least two elements');
    }

    seq.forEach(function (n, i) {
      if (i > 0 && (seq[i - 1] < n) !== up) {
        throw new Error('expected values to ' + (up ? 'increase' : 'decrease'));
      }
    });
  }

  function generalTests(seq, args) {
    it('obeys the min arg', function () {
      expect(Math.min.apply(Math, seq)).to.be(args.min);
    });

    it('obeys the max arg', function () {
      expect(Math.max.apply(Math, seq)).to.be(args.max);
    });

    it('obeys the length arg', function () {
      expect(seq).to.have.length(args.length);
    });

    it('always creates increasingly larger values', function () {
      expectedChange(seq, true);
    });
  }

  describe('#createEaseIn', function () {
    eachSeqFor(sequencer.createEaseIn, function (seq, args) {
      describe('with args: ' + JSON.stringify(args), function () {
        generalTests(seq, args);

        it('produces increasing slopes', function () {
          expectedChange(getSlopes(seq, 2), true);
          expectedChange(getSlopes(seq, 4), true);
          expectedChange(getSlopes(seq, 6), true);
        });
      });
    });
  });

  describe('#createEaseOut', function () {
    eachSeqFor(sequencer.createEaseOut, function (seq, args) {
      describe('with args: ' + JSON.stringify(args), function () {
        generalTests(seq, args);

        it('produces decreasing slopes', function () {
          expectedChange(getSlopes(seq, 2), false);
          expectedChange(getSlopes(seq, 4), false);
          expectedChange(getSlopes(seq, 6), false);
        });

        // Flipped version of previous test to ensure that expectedChange()
        // and friends are behaving properly
        it('doesn\'t produce increasing slopes', function () {
          expect(function () {
            expectedChange(getSlopes(seq, 2), true);
          }).to.throwError();

          expect(function () {
            expectedChange(getSlopes(seq, 4), true);
          }).to.throwError();

          expect(function () {
            expectedChange(getSlopes(seq, 6), true);
          }).to.throwError();
        });
      });
    });
  });
});
