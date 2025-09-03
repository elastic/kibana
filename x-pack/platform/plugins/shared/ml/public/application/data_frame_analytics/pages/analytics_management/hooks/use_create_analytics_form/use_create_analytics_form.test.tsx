/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useCreateAnalyticsForm } from './use_create_analytics_form';
import { kibanaContextMock } from '../../../../../contexts/kibana/__mocks__/kibana_context';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const getRenderHook = () =>
  renderHook(() => useCreateAnalyticsForm(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <KibanaContextProvider services={kibanaContextMock.services}>
        {children}
      </KibanaContextProvider>
    ),
  });

describe('useCreateAnalyticsForm()', () => {
  test('initialization', () => {
    const { result } = getRenderHook();
    const { actions } = result.current;

    expect(typeof actions.createAnalyticsJob).toBe('function');
    expect(typeof actions.startAnalyticsJob).toBe('function');
    expect(typeof actions.setFormState).toBe('function');
  });

  // TODO
  // add tests for createAnalyticsJob() and startAnalyticsJob()
  // once React 16.9 with support for async act() is available.
});
