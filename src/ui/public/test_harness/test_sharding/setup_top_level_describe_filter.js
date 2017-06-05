/**
 *  Intercept all calls to mocha.describe() and determine
 *  which calls make it through using a filter function.
 *
 *  The filter function is also only called for top-level
 *  describe() calls; all describe calls nested within another
 *  are allowed based on the filter value for the parent
 *  describe
 *
 *  ## example
 *
 *  assume tests that look like this:
 *
 *  ```js
 *  describe('section 1', () => {
 *    describe('item 1', () => {
 *
 *    })
 *  })
 *  ```
 *
 *  If the filter function returned true for "section 1" then "item 1"
 *  would automatically be defined. If it returned false for "section 1"
 *  then "section 1" would be ignored and "item 1" would never be defined
 *
 *  @param {function} test - a function that takes the first argument
 *                             passed to describe, the sections name, and
 *                             returns true if the describe call should
 *                             be delegated to mocha, any other value causes
 *                             the describe call to be ignored
 *  @return {undefined}
 */
export function setupTopLevelDescribeFilter(test) {
  const originalDescribe = window.describe;

  if (!originalDescribe) {
    throw new TypeError('window.describe must be defined by mocha before test sharding can be setup');
  }

  /**
   *  When describe is called it is likely to make additional, nested,
   *  calls to describe. We track how deeply nested we are at any time
   *  with a depth counter, `describeCallDepth`.
   *
   *  Before delegating a describe call to mocha we increment
   *  that counter, and once mocha is done we decrement it.
   *
   *  This way, we can check if `describeCallDepth > 0` at any time
   *  to know if we are already within a describe call.
   *
   *  ```js
   *  // +1
   *  describe('section 1', () => {
   *    // describeCallDepth = 1
   *    // +1
   *    describe('item 1', () => {
   *      // describeCallDepth = 2
   *    })
   *    // -1
   *  })
   *  // -1
   *  // describeCallDepth = 0
   *  ```
   *
   *  @type {Number}
   */
  let describeCallDepth = 0;

  const describeInterceptor = function (describeName, describeBody) {
    const context = this;

    const isTopLevelCall = describeCallDepth === 0;
    const shouldIgnore = isTopLevelCall && Boolean(test(describeName)) === false;
    if (shouldIgnore) return;

    /**
     *  we wrap the delegation to mocha in a try/finally block
     *  to ensure that our describeCallDepth counter stays up
     *  to date even if the call throws an error.
     *
     *  note that try/finally won't actually catch the error, it
     *  will continue to propogate up the call stack
     */
    let result;
    try {
      describeCallDepth += 1;
      result = originalDescribe.call(context, describeName, describeBody);
    } finally {
      describeCallDepth -= 1;
    }
    return result;
  };

  // to allow describe.only calls. we dont need interceptor as it will call describe internally
  describeInterceptor.only = originalDescribe.only;
  describeInterceptor.skip = originalDescribe.skip;

  // ensure that window.describe isn't messed with by other code
  Object.defineProperty(window, 'describe', {
    configurable: false,
    enumerable: true,
    value: describeInterceptor
  });
}
