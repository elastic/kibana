import { assign } from 'lodash';

import { mergeType } from './merge_type';

/**
 *  Creates a reducer that merges specs by concatenating the values of
 *  all keys in accumulator and spec with the same logic as concat
 *  @param  {[type]} initial [description]
 *  @return {[type]}         [description]
 */
export const concatValues = mergeType((objectA, objectB) => (
  assign({}, objectA || {}, objectB || {}, (a, b) => (
    [].concat(a || [], b || [])
  ))
));
