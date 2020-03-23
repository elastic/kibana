/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put } from 'redux-saga/effects';
import { fetchEffectFactory } from '../fetch_effect';
import { indexStatusAction } from '../../actions';

describe('fetch saga effect factory', () => {
  const asyncAction = indexStatusAction;
  const calledAction = asyncAction.get();
  let fetchEffect;

  it('works with success workflow', () => {
    const indexStatusResult = { indexExists: true, docCount: 2712532 };
    const fetchStatus = async () => {
      return { indexExists: true, docCount: 2712532 };
    };
    fetchEffect = fetchEffectFactory(
      fetchStatus,
      asyncAction.success,
      asyncAction.fail
    )(calledAction);
    let next = fetchEffect.next();

    // @ts-ignore TODO, dig dipper for TS issues here
    expect(next.value).toEqual(call(fetchStatus, calledAction.payload));

    const successResult = put(asyncAction.success(indexStatusResult));

    next = fetchEffect.next(indexStatusResult);

    expect(next.value).toEqual(successResult);
  });

  it('works with error workflow', () => {
    const indexStatusResultError = new Error('no heartbeat index found');
    const fetchStatus = async () => {
      return indexStatusResultError;
    };
    fetchEffect = fetchEffectFactory(
      fetchStatus,
      asyncAction.success,
      asyncAction.fail
    )(calledAction);
    let next = fetchEffect.next();

    // @ts-ignore TODO, dig dipper for TS issues here
    expect(next.value).toEqual(call(fetchStatus, calledAction.payload));

    const errorResult = put(asyncAction.fail(indexStatusResultError));

    next = fetchEffect.next(indexStatusResultError);

    expect(next.value).toEqual(errorResult);
  });

  it('works with throw error workflow', () => {
    const unExpectedError = new Error('no url found, so throw error');
    const fetchStatus = async () => {
      return await fetch('/some/url');
    };
    fetchEffect = fetchEffectFactory(
      fetchStatus,
      asyncAction.success,
      asyncAction.fail
    )(calledAction);
    let next = fetchEffect.next();

    // @ts-ignore TODO, dig dipper for TS issues here
    expect(next.value).toEqual(call(fetchStatus, calledAction.payload));

    const unexpectedErrorResult = put(asyncAction.fail(unExpectedError));

    next = fetchEffect.next(unExpectedError);

    expect(next.value).toEqual(unexpectedErrorResult);
  });
});
