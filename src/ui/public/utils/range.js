import _ from 'lodash';

/**
 * Regexp portion that matches our number
 *
 * supports:
 *   -100
 *   -100.0
 *   0
 *   0.10
 *   Infinity
 *   -Infinity
 *
 * @type {String}
 */
const _RE_NUMBER = '(\\-?(?:\\d+(?:\\.\\d+)?|Infinity))';

/**
 * Regexp for the interval notation
 *
 * supports:
 *   [num, num]
 *   ( num , num ]
 *   [Infinity,num)
 *
 * @type {RegExp}
 */
const RANGE_RE = new RegExp('^\\s*([\\[|\\(])\\s*' + _RE_NUMBER + '\\s*,\\s*' + _RE_NUMBER + '\\s*([\\]|\\)])\\s*$');

function parse(input) {

  const match = String(input).match(RANGE_RE);
  if (!match) {
    throw new TypeError('expected input to be in interval notation eg. (100, 200]');
  }

  return new Range(
    match[1] === '[',
    parseFloat(match[2]),
    parseFloat(match[3]),
    match[4] === ']'
  );
}

function Range(/* minIncl, min, max, maxIncl */) {
  const args = _.toArray(arguments);
  if (args[1] > args[2]) args.reverse();

  this.minInclusive = args[0];
  this.min = args[1];
  this.max = args[2];
  this.maxInclusive = args[3];
}

Range.prototype.within = function (n) {
  if (this.min === n && !this.minInclusive) return false;
  if (this.min > n) return false;

  if (this.max === n && !this.maxInclusive) return false;
  if (this.max < n) return false;

  return true;
};

export default parse;

