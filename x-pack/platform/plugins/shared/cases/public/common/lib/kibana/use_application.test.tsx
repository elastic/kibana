/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicAppInfo } from '@kbn/core-application-browser';
import { AppStatus } from '@kbn/core-application-browser';
import { renderHook } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { useApplication } from './use_application';
import { TestProviders } from '../../mock';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';

describe('useApplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getApp = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
    id: 'testAppId',
    title: 'Test title',
    status: AppStatus.accessible,
    visibleIn: ['globalSearch'],
    appRoute: `/app/some-id`,
    keywords: [],
    deepLinks: [],
    ...props,
  });

  it('returns the appId and the appTitle correctly', () => {
    const { result } = renderHook(() => useApplication(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: 'Test',
    });
  });

  it('returns undefined appId and appTitle if the currentAppId observable is not defined', () => {
    const coreStart = coreMock.createStart();
    coreStart.application.currentAppId$ = new Subject();

    const { result } = renderHook(() => useApplication(), {
      wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
    });

    expect(result.current).toEqual({});
  });

  it('returns undefined appTitle if the applications observable is not defined', () => {
    const coreStart = coreMock.createStart();
    coreStart.application.applications$ = new Subject();

    const { result } = renderHook(() => useApplication(), {
      wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: undefined,
    });
  });

  it('returns the label as appTitle', () => {
    const coreStart = coreMock.createStart();
    coreStart.application.applications$ = new BehaviorSubject(
      new Map([['testAppId', getApp({ category: { id: 'test-label-id', label: 'Test label' } })]])
    );

    const { result } = renderHook(() => useApplication(), {
      wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: 'Test label',
    });
  });

  it('returns the title as appTitle if the categories label is missing', () => {
    const coreStart = coreMock.createStart();
    coreStart.application.applications$ = new BehaviorSubject(
      new Map([['testAppId', getApp({ title: 'Test title' })]])
    );

    const { result } = renderHook(() => useApplication(), {
      wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: 'Test title',
    });
  });

  it('gets the value from the default value of the currentAppId observable if it exists', () => {
    const coreStart = coreMock.createStart();
    coreStart.application.currentAppId$ = new BehaviorSubject('new-test-id');

    const { result } = renderHook(() => useApplication(), {
      wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
    });

    expect(result.current).toEqual({ appId: 'new-test-id' });
  });
});
