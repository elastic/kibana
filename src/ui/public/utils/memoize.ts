/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * A simple memoize function, that only stores the last returned value
 * and uses the identity of all passed parameters as a cache key.
 */
function memoizeLast<T extends (...args: any[]) => any>(func: T): T {
  let prevResult: any;
  let called: boolean = false;
  let prevThis: any;
  let prevArgs: any[];

  // We need to use a `function` here for proper this passing.
  // tslint:disable-next-line:only-arrow-functions
  const memoizedFunction = function(this: any, ...args: any[]) {
    if (
      called &&
      prevThis === this &&
      prevArgs.length === args.length &&
      args.every((arg, index) => arg === prevArgs[index])
    ) {
      return prevResult;
    }
    called = true;
    prevThis = this;
    prevArgs = args;
    prevResult = func.apply(this, args);
    return prevResult;
  } as T;

  return memoizedFunction;
}

export { memoizeLast };
