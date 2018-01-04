/**
 *  Wrap a function with any number of wrappers. Wrappers
 *  are functions that take a reducer and return a reducer
 *  that should be called in its place. The wrappers will
 *  be called in reverse order for setup and then in the
 *  order they are defined when the resulting reducer is
 *  executed.
 *
 *  const reducer = wrap(
 *    next => (acc) => acc[1] = 'a',
 *    next => (acc) => acc[1] = 'b',
 *    next => (acc) => acc[1] = 'c'
 *  )
 *
 *  reducer('foo') //=> 'fco'
 *
 *  @param  {Function} ...wrappers
 *  @param  {Function} reducer
 *  @return {Function}
 */
export function wrap(...args) {
  const reducer = args[args.length - 1];
  const wrappers = args.slice(0, -1);

  return wrappers
    .reverse()
    .reduce((acc, wrapper) => wrapper(acc), reducer);
}
