/**
 *  Creates a reducer wrapper which, when called with a reducer, creates a new
 *  reducer that replaces the `specs` value with the result of calling
 *  `mapFn(spec, type, pluginSpec)` before delegating to the wrapped
 *  reducer
 *  @param  {Function} mapFn receives `(specs, type, pluginSpec)`
 *  @return {Function}
 */
export const mapSpec = (mapFn) => (next) => (acc, spec, type, pluginSpec) => (
  next(acc, mapFn(spec, type, pluginSpec), type, pluginSpec)
);
