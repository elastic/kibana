/**
 * Some helper functions when working with mocha
 */

'use strict';

var exports = module.exports;

/**
 * Take a collection of stats objects and reduce them
 *
 * @param stats {Array} Array of mocha test stats
 */

exports.reduceStats = function(stats) {
  var initial = {
    passes    : 0,
    failures  : 0,
    tests     : 0,
    duration  : 0
  };

  // console.log(testStats);
  var total = stats.reduce(function(prev, stats, i, list) {
    prev.passes    += stats.passes;
    prev.failures  += stats.failures;
    prev.tests     += stats.tests;
    prev.duration  += (stats.end - stats.start);
    return prev;
  }, initial);

  total.duration = this.formatMs(total.duration);

  return total;
};

exports.formatMs = function(ms) {
  return (Math.ceil(ms * 100) / 100000).toFixed(2);
}
