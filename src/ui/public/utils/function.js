import _ from 'lodash';

/**
 * Call all of the function in an array
 *
 * @param  {array[functions]} arr
 * @return {undefined}
 */
export function callEach(arr) {
  return _.map(arr, function (fn) {
    return _.isFunction(fn) ? fn() : undefined;
  });
}
