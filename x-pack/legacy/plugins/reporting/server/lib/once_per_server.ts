/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize, MemoizedFunction } from 'lodash';
import { ServerFacade } from '../../types';

type ServerFn = (server: ServerFacade) => any;
type Memo = ((server: ServerFacade) => any) & MemoizedFunction;

/**
 * allow this function to be called multiple times, but
 * ensure that it only received one argument, the server,
 * and cache the return value so that subsequent calls get
 * the exact same value.
 *
 * This is intended to be used by service factories like getObjectQueueFactory
 *
 * @param  {Function} fn - the factory function
 * @return {any}
 */
export function oncePerServer(fn: ServerFn) {
  const memoized: Memo = memoize(function(server: ServerFacade) {
    if (arguments.length !== 1) {
      throw new TypeError('This function expects to be called with a single argument');
    }

    // @ts-ignore
    return fn.call(this, server);
  });

  // @ts-ignore
  // Type 'WeakMap<object, any>' is not assignable to type 'MapCache

  // use a weak map a the cache so that:
  //  1. return values mapped to the actual server instance
  //  2. return value lifecycle matches that of the server
  memoized.cache = new WeakMap();

  return memoized;
}
