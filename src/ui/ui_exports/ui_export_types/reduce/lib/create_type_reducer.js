/**
 *  Creates a reducer that reduces the values within `acc[type]` by calling
 *  reducer with signature:
 *
 *     reducer(acc[type], spec, type, pluginSpec)
 *
 *  @param  {Function} reducer
 *  @return {Function}
 */
export const createTypeReducer = (reducer) => (acc, spec, type, pluginSpec) => ({
  ...acc,
  [type]: reducer(acc[type], spec, type, pluginSpec)
});
