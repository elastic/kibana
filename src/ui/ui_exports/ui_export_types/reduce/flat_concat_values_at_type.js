import {
  createTypeReducer,
  flatConcat,
  mergeWith,
} from './lib';

/**
 *  Reducer that merges specs by concatenating the values of
 *  all keys in accumulator and spec with the same logic as concat
 *  @param  {[type]} initial [description]
 *  @return {[type]}         [description]
 */
export const flatConcatValuesAtType = createTypeReducer((objectA, objectB) => (
  mergeWith(objectA || {}, objectB || {}, flatConcat)
));
