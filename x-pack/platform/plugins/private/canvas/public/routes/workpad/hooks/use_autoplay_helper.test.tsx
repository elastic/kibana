/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { useAutoplayHelper } from './use_autoplay_helper';
import { WorkpadRoutingContext, WorkpadRoutingContextType } from '../workpad_routing_context';

const getMockedContext = (context: any) =>
  ({
    nextPage: jest.fn(),
    isFullscreen: false,
    autoplayInterval: 0,
    isAutoplayPaused: false,
    ...context,
  } as WorkpadRoutingContextType);

const getContextWrapper: (context: WorkpadRoutingContextType) => FC<PropsWithChildren<unknown>> =
  (context) =>
  ({ children }) =>
    <WorkpadRoutingContext.Provider value={context}>{children}</WorkpadRoutingContext.Provider>;

describe('useAutoplayHelper', () => {
  beforeEach(() => jest.useFakeTimers({ legacyFakeTimers: true }));
  test('starts the timer when fullscreen and autoplay is on', () => {
    const context = getMockedContext({
      isFullscreen: true,
      autoplayInterval: 1,
    });

    renderHook(useAutoplayHelper, { wrapper: getContextWrapper(context) });

    jest.runAllTimers();

    expect(context.nextPage).toHaveBeenCalled();
  });

  test('stops the timer when autoplay pauses', () => {
    const context = getMockedContext({
      isFullscreen: true,
      autoplayInterval: 1000,
    });

    const { rerender } = renderHook(useAutoplayHelper, { wrapper: getContextWrapper(context) });

    jest.advanceTimersByTime(context.autoplayInterval - 1);

    context.isAutoplayPaused = true;

    rerender();

    jest.runAllTimers();

    expect(context.nextPage).not.toHaveBeenCalled();
  });

  test('starts the timer when autoplay unpauses', () => {
    const context = getMockedContext({
      isFullscreen: true,
      autoplayInterval: 1000,
      isAutoplayPaused: true,
    });

    const { rerender } = renderHook(useAutoplayHelper, { wrapper: getContextWrapper(context) });

    jest.runAllTimers();

    expect(context.nextPage).not.toHaveBeenCalled();

    context.isAutoplayPaused = false;

    rerender();

    jest.runAllTimers();

    expect(context.nextPage).toHaveBeenCalled();
  });
});
