/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { InterceptDialogApi } from './intercept_dialog_api';

describe('InterceptDialogApi', () => {
  it('exposes the setup and start public methods', () => {
    const intercept = new InterceptDialogApi();

    expect(intercept).toHaveProperty('setup', expect.any(Function));
    expect(intercept).toHaveProperty('start', expect.any(Function));
  });

  describe('start', () => {
    const analytics = analyticsServiceMock.createAnalyticsServiceStart();

    let interceptApi: ReturnType<InterceptDialogApi['start']>;

    const intercept: Parameters<ReturnType<InterceptDialogApi['start']>['add']>[0] = {
      id: 'test-intercept',
      runId: 1234,
      steps: [
        {
          id: 'start' as const,
          title: 'Hello',
          content: () => <>{'Couple of questions for you sir'}</>,
        },
        {
          id: 'interest',
          title: 'Are you interested?',
          content: () => <>{'...'}</>,
        },
        { id: 'completion' as const, title: 'Goodbye', content: () => <>{'Goodbye sir'}</> },
      ],
      onFinish: jest.fn(),
    };

    beforeEach(() => {
      const interceptDialog = new InterceptDialogApi();

      interceptApi = interceptDialog.start({ analytics });
    });

    it('has specific properties', () => {
      expect(interceptApi).toHaveProperty('add', expect.any(Function));
      expect(interceptApi).toHaveProperty('ack', expect.any(Function));
      expect(interceptApi).toHaveProperty('get$', expect.any(Function));
    });

    it('invoking the add method adds an intercept', () => {
      const nextHandlerFn = jest.fn();

      const sub = interceptApi.get$().subscribe(nextHandlerFn);

      interceptApi.add(intercept);

      expect(nextHandlerFn).toHaveBeenCalledTimes(2); // called because of the initial value and the new intercept
      expect(nextHandlerFn).toHaveBeenLastCalledWith([intercept]);

      sub.unsubscribe();
    });

    it('invoking the add method multiple times with an intercept matching the same id is idempotent', () => {
      const nextHandlerFn = jest.fn();

      const sub = interceptApi.get$().subscribe(nextHandlerFn);

      Array.from({ length: 5 }).forEach(() => {
        interceptApi.add(intercept);
      });

      expect(nextHandlerFn).toHaveBeenCalledTimes(2); // called because of the initial value and the new intercept
      expect(nextHandlerFn).toHaveBeenLastCalledWith([intercept]);

      sub.unsubscribe();
    });

    it('invoking the ack method with the id of an existing intercept removes said intercept', () => {
      const nextHandlerFn = jest.fn();

      const sub = interceptApi.get$().subscribe(nextHandlerFn);

      // add intercept we'd like to perform an ack on
      interceptApi.add(intercept);

      expect(nextHandlerFn).toHaveBeenCalledTimes(2); // called because of the initial value and the new intercept
      expect(nextHandlerFn).toHaveBeenLastCalledWith([intercept]);

      interceptApi.ack({ interceptId: intercept.id, ackType: 'dismissed', interactionDuration: 0 });

      expect(nextHandlerFn).toHaveBeenCalledTimes(3); // called because of the initial value, the new intercept, and the ack
      expect(nextHandlerFn).toHaveBeenLastCalledWith([]);

      sub.unsubscribe();
    });
  });
});
