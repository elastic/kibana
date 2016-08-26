import _ from 'lodash';

function create(min, max, length, mod) {
  const seq = new Array(length);

  const valueDist = max - min;

  // range of values that the mod creates
  const modRange = [mod(0, length), mod(length - 1, length)];

  // distance between
  const modRangeDist = modRange[1] - modRange[0];

  _.times(length, function (i) {
    const modIPercent = (mod(i, length) - modRange[0]) / modRangeDist;

    // percent applied to distance and added to min to
    // produce value
    seq[i] = min + (valueDist * modIPercent);
  });

  seq.min = min;
  seq.max = max;

  return seq;
}

export default {
  /**
   * Create an exponential sequence of numbers.
   *
   * Creates a curve resembling:
   *
   *                                                         ;
   *                                                         /
   *                                                        /
   *                                                     .-'
   *                                                 _.-"
   *                                            _.-'"
   *                                      _,.-'"
   *                               _,..-'"
   *                       _,..-'""
   *              _,..-'""
   *  ____,..--'""
   *
   * @param {number} min - the min value to produce
   * @param {number} max - the max value to produce
   * @param {number} length - the number of values to produce
   * @return {number[]} - an array containing the sequence
   */
  createEaseIn: _.partialRight(create, function (i) {
    // generates numbers from 1 to +Infinity
    return i * Math.pow(i, 1.1111);
  }),

  /**
   * Create an sequence of numbers using sine.
   *
   * Create a curve resembling:
   *
   *                                            ____,..--'""
   *                                    _,..-'""
   *                            _,..-'""
   *                     _,..-'"
   *               _,.-'"
   *          _.-'"
   *      _.-"
   *   .-'
   *  /
   * /
   * ;
   *
   *
   * @param {number} min - the min value to produce
   * @param {number} max - the max value to produce
   * @param {number} length - the number of values to produce
   * @return {number[]} - an array containing the sequence
   */
  createEaseOut: _.partialRight(create, function (i, length) {
    // adapted from output of http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm
    // generates numbers from 0 to 100

    const ts = (i /= length) * i;
    const tc = ts * i;
    return 100 * (
      0.5 * tc * ts +
      -3 * ts * ts +
      6.5 * tc +
      -7 * ts +
      4 * i
    );
  })
};
