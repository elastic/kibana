/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { renderHook } from '@testing-library/react';
import { createAppChromeMock } from '../test_utils/app_chrome_mock';
import {
  type ContextEngineBreadcrumb,
  useContextEngineBreadcrumbs,
} from './use_context_engine_breadcrumbs';

const mockUseKibana = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

const getUrlForApp = (appId: string, options?: { path?: string }) =>
  `/app/${appId}${options?.path ?? ''}`;

describe('useContextEngineBreadcrumbs', () => {
  const createServices = (
    chromeStyle: 'classic' | 'project' = 'classic',
    options: { appChrome?: ReturnType<typeof createAppChromeMock> } = {}
  ) => {
    const core = coreMock.createStart();
    core.chrome.getChromeStyle.mockReturnValue(chromeStyle);
    jest.spyOn(core.application, 'getUrlForApp').mockImplementation(getUrlForApp);

    mockUseKibana.mockReturnValue({
      services: {
        application: core.application,
        appChrome: options.appChrome,
        chrome: core.chrome,
      },
    });

    return { core };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets Build > Context breadcrumbs in classic chrome without a trail', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    renderHook(() => useContextEngineBreadcrumbs());

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: undefined },
    ]);
  });

  it('links Context and resolves the trail in classic chrome', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    renderHook(() => useContextEngineBreadcrumbs([{ text: 'my-ai-index' }]));

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: '/app/context_engine' },
      { text: 'my-ai-index', href: undefined },
    ]);
  });

  it('resolves a multi-level trail with and without paths', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    renderHook(() =>
      useContextEngineBreadcrumbs([
        { text: 'my-ai-index', path: '/ai_index/my-ai-index/knowledge_indicators' },
        { text: 'my-ki' },
      ])
    );

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: '/app/context_engine' },
      {
        text: 'my-ai-index',
        href: '/app/context_engine/ai_index/my-ai-index/knowledge_indicators',
      },
      { text: 'my-ki', href: undefined },
    ]);
  });

  it('only sets the trail in project chrome', () => {
    const appChrome = createAppChromeMock();
    createServices('project', { appChrome });

    renderHook(() => useContextEngineBreadcrumbs([{ text: 'Create AI index' }]));

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Create AI index', href: undefined },
    ]);
  });

  it('does not set breadcrumbs in project chrome when there is no trail', () => {
    const appChrome = createAppChromeMock();
    createServices('project', { appChrome });

    renderHook(() => useContextEngineBreadcrumbs());

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).not.toHaveBeenCalled();
  });

  it('does not clear breadcrumbs on unmount when none were set', () => {
    const appChrome = createAppChromeMock();
    createServices('project', { appChrome });

    const { unmount } = renderHook(() => useContextEngineBreadcrumbs());
    unmount();

    expect(appChrome.breadcrumbs.clearBreadcrumbs).not.toHaveBeenCalled();
  });

  it('clears breadcrumbs on unmount', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    const { unmount } = renderHook(() => useContextEngineBreadcrumbs([{ text: 'my-ai-index' }]));
    unmount();

    expect(appChrome.breadcrumbs.clearBreadcrumbs).toHaveBeenCalled();
  });

  it('updates breadcrumbs when the trail changes', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    const { rerender } = renderHook(
      ({ breadcrumbs }: { breadcrumbs: ContextEngineBreadcrumb[] }) =>
        useContextEngineBreadcrumbs(breadcrumbs),
      { initialProps: { breadcrumbs: [{ text: 'first' }] } }
    );

    rerender({ breadcrumbs: [{ text: 'second' }] });

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenLastCalledWith([
      { text: 'Build' },
      { text: 'Context', href: '/app/context_engine' },
      { text: 'second', href: undefined },
    ]);
  });

  it('does not reset breadcrumbs when the trail content is unchanged', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    const { rerender } = renderHook(
      ({ breadcrumbs }: { breadcrumbs: ContextEngineBreadcrumb[] }) =>
        useContextEngineBreadcrumbs(breadcrumbs),
      { initialProps: { breadcrumbs: [{ text: 'my-ai-index' }] } }
    );

    jest.mocked(appChrome.breadcrumbs.setAppBreadcrumbs).mockClear();

    rerender({ breadcrumbs: [{ text: 'my-ai-index' }] });

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).not.toHaveBeenCalled();
  });

  it('falls back to core breadcrumbs in classic chrome when appChrome is unavailable', () => {
    const { core } = createServices('classic', { appChrome: undefined });

    renderHook(() => useContextEngineBreadcrumbs([{ text: 'my-ai-index' }]));

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: '/app/context_engine' },
      { text: 'my-ai-index', href: undefined },
    ]);
  });

  it('falls back to core project breadcrumbs when appChrome is unavailable', () => {
    const { core } = createServices('project', { appChrome: undefined });

    renderHook(() => useContextEngineBreadcrumbs([{ text: 'Create AI index' }]));

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([], {
      project: { value: [{ text: 'Create AI index', href: undefined }] },
    });
  });

  it('clears core breadcrumbs on unmount when appChrome is unavailable', () => {
    const { core } = createServices('classic', { appChrome: undefined });

    const { unmount } = renderHook(() => useContextEngineBreadcrumbs([{ text: 'my-ai-index' }]));
    unmount();

    expect(core.chrome.setBreadcrumbs).toHaveBeenLastCalledWith([], {
      project: { value: [] },
    });
  });
});
