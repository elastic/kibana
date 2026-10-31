/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServiceMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { getFallbackKibanaUrl, useKibanaUrl } from './use_kibana_url';

const renderUseKibanaUrl = (core: ReturnType<typeof coreMock.createStart>) => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services: core }, children);

  return renderHook(() => useKibanaUrl(), { wrapper });
};

// `http.spaceId` is readonly on the real contract; the mock still allows overriding it at runtime.
const setSpaceId = (core: ReturnType<typeof coreMock.createStart>, spaceId: string) => {
  Object.defineProperty(core.http, 'spaceId', { value: spaceId, configurable: true });
};

describe('getFallbackKibanaUrl', () => {
  it('uses origin and server base path', () => {
    const http = httpServiceMock.createStartContract({ basePath: '/base' });
    expect(getFallbackKibanaUrl(http)).toBe(`${window.location.origin}/base`);
  });
});

describe('useKibanaUrl', () => {
  it('uses server base path fallback when publicBaseUrl is undefined', () => {
    const core = coreMock.createStart({ basePath: '/base' });
    setSpaceId(core, 'default');

    const { result } = renderUseKibanaUrl(core);

    expect(result.current.kibanaUrl).toBe(`${window.location.origin}/base`);
  });

  it('prefers publicBaseUrl over cloud.kibanaUrl', () => {
    const core = coreMock.createStart({ basePath: '/ignored' });
    core.http = httpServiceMock.createStartContract({
      basePath: '/ignored',
      publicBaseUrl: 'https://kibana.example.com/w',
    });
    setSpaceId(core, 'default');
    Object.assign(core, { cloud: { kibanaUrl: 'https://cloud.example.com' } });

    const { result } = renderUseKibanaUrl(core);

    expect(result.current.kibanaUrl).toBe('https://kibana.example.com/w');
  });

  it('falls back to cloud.kibanaUrl when publicBaseUrl is not set', () => {
    const core = coreMock.createStart({ basePath: '/base' });
    setSpaceId(core, 'default');
    Object.assign(core, { cloud: { kibanaUrl: 'https://cloud.example.com' } });

    const { result } = renderUseKibanaUrl(core);

    expect(result.current.kibanaUrl).toBe('https://cloud.example.com');
  });

  it('adds the space prefix for non-default spaces', () => {
    const core = coreMock.createStart({ basePath: '/base' });
    setSpaceId(core, 'my-space');

    const { result } = renderUseKibanaUrl(core);

    expect(result.current.kibanaUrl).toBe(`${window.location.origin}/base/s/my-space`);
  });
});
