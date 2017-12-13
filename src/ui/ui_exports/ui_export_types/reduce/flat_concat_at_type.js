import { createTypeReducer, flatConcat } from './lib';

/**
 *  Reducer that merges two values concatenating all values
 *  into a flattened array
 *  @param  {Any} [initial]
 *  @return {Function}
 */
export const flatConcatAtType = createTypeReducer(flatConcat);
