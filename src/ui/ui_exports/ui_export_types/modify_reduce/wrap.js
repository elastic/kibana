/**
 *  Wrap a reducer
 *  @param  {Function} ...wrappers
 *  @param  {Function} reducer
 *  @return {Function}
 */
export function wrap(...args) {
  return args.reverse().reduce((reducer, decorate) => decorate(reducer));
}
