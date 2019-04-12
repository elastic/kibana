/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  inFlightActive,
  inFlightComplete,
  setLoading,
  setValue,
} from '../../actions/resolved_args';
import { inFlightMiddlewareFactory } from '../in_flight';

const next = jest.fn();
const dispatch = jest.fn();
const loadingIndicator = {
  show: jest.fn(),
  hide: jest.fn(),
};
const pendingCache: string[] = [];

const testMiddleware = inFlightMiddlewareFactory({
  loadingIndicator,
  pendingCache,
})({ dispatch, getState: jest.fn() })(next);

describe('inflight middleware', () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  describe('loading indicator', () => {
    beforeEach(() => {
      loadingIndicator.show = jest.fn();
      loadingIndicator.hide = jest.fn();
    });

    it('shows the loading indicator on inFlightActive action', () => {
      const inFlightActiveAction = inFlightActive();

      testMiddleware(inFlightActiveAction);

      expect(loadingIndicator.show).toBeCalled();
    });

    it('hides the loading indicator on inFlightComplete action', () => {
      const inFlightCompleteAction = inFlightComplete();

      testMiddleware(inFlightCompleteAction);
      expect(loadingIndicator.hide).toBeCalled();
    });

    describe('value', () => {
      beforeEach(() => {
        while (pendingCache.length) {
          pendingCache.pop();
        }
      });

      it('dispatches the inFlightAction for loadingValue actions', () => {
        const path = ['some', 'path'];
        const loadingAction = setLoading({ path });

        testMiddleware(loadingAction);

        expect(dispatch).toBeCalledWith(inFlightActive());
      });

      it('adds path to pendingCache for loadingValue actions', () => {
        const expectedPath = 'path';
        const path = [expectedPath];
        const loadingAction = setLoading({ path });

        testMiddleware(loadingAction);

        expect(pendingCache[0]).toBe(expectedPath);
      });

      it('dispatches inFlight complete if all pending is resolved', () => {
        const resolvedPath1 = 'path1';
        const resolvedPath2 = 'path2';

        const setAction1 = setValue({ path: [resolvedPath1], value: {} });
        const setAction2 = setValue({ path: [resolvedPath2], value: {} });

        pendingCache.push(resolvedPath1);
        pendingCache.push(resolvedPath2);

        testMiddleware(setAction1);
        expect(dispatch).not.toBeCalled();

        testMiddleware(setAction2);
        expect(dispatch).toBeCalledWith(inFlightComplete());
      });
    });
  });
});
