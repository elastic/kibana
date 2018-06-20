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

export function tryPromise(fn, args, ctx) {
  if (typeof fn !== 'function') {
    return Promise.reject(new TypeError('fn must be a function'));
  }

  let value;

  if (Array.isArray(args)) {
    try { value = fn.apply(ctx, args); }
    catch (e) { return Promise.reject(e); }
  } else {
    try { value = fn.call(ctx, args); }
    catch (e) { return Promise.reject(e); }
  }

  return Promise.resolve(value);
}

export function isPromise(obj) {
  return obj && typeof obj.then === 'function';
}

export function mapPromises(arr, fn) {
  return Promise.all(arr.map(function (i, el, list) {
    return tryPromise(fn, [i, el, list]);
  }));
}
