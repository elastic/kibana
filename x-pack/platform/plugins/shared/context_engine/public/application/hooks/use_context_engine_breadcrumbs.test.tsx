/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { renderHook } from '@testing-library/react';
import { CONTEXT_ENGINE_APP_PATH } from '../../../common/features';
import { createAppChromeMock } from '../test_utils/app_chrome_mock';
import { useContextEngineBreadcrumbs } from './use_context_engine_breadcrumbs';

const mockUseKibana = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

describe('useContextEngineBreadcrumbs', () => {
  const createServices = (
    chromeStyle: 'classic' | 'project' = 'classic',
    options: { basePath?: string; appChrome?: ReturnType<typeof createAppChromeMock> } = {}
  ) => {
    const core = coreMock.createStart({ basePath: options.basePath ?? '' });
    core.chrome.getChromeStyle.mockReturnValue(chromeStyle);

    mockUseKibana.mockReturnValue({
      services: {
        http: core.http,
        appChrome: options.appChrome,
        chrome: core.chrome,
      },
    });

    return { core };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets Build > Context breadcrumbs in classic chrome without a page name', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    renderHook(() => useContextEngineBreadcrumbs());

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: undefined },
    ]);
  });

  it('adds a link on Context and appends the page name in classic chrome', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    renderHook(() => useContextEngineBreadcrumbs('my-ai-index'));

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: CONTEXT_ENGINE_APP_PATH },
      { text: 'my-ai-index' },
    ]);
  });

  it('only sets the page name breadcrumb in project chrome', () => {
    const appChrome = createAppChromeMock();
    createServices('project', { appChrome });

    renderHook(() => useContextEngineBreadcrumbs('Create AI index'));

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Create AI index' },
    ]);
  });

  it('does not set breadcrumbs in project chrome when there is no page name', () => {
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

    const { unmount } = renderHook(() => useContextEngineBreadcrumbs('my-ai-index'));
    unmount();

    expect(appChrome.breadcrumbs.clearBreadcrumbs).toHaveBeenCalled();
  });

  it('updates breadcrumbs when the page name changes', () => {
    const appChrome = createAppChromeMock();
    createServices('classic', { appChrome });

    const { rerender } = renderHook(
      ({ pageName }: { pageName?: string }) => useContextEngineBreadcrumbs(pageName),
      { initialProps: { pageName: 'first' } }
    );

    rerender({ pageName: 'second' });

    expect(appChrome.breadcrumbs.setAppBreadcrumbs).toHaveBeenLastCalledWith([
      { text: 'Build' },
      { text: 'Context', href: CONTEXT_ENGINE_APP_PATH },
      { text: 'second' },
    ]);
  });

  it('falls back to core breadcrumbs in classic chrome when appChrome is unavailable', () => {
    const { core } = createServices('classic', { appChrome: undefined });

    renderHook(() => useContextEngineBreadcrumbs('my-ai-index'));

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: CONTEXT_ENGINE_APP_PATH },
      { text: 'my-ai-index' },
    ]);
  });

  it('falls back to core project breadcrumbs when appChrome is unavailable', () => {
    const { core } = createServices('project', { appChrome: undefined });

    renderHook(() => useContextEngineBreadcrumbs('Create AI index'));

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([], {
      project: { value: [{ text: 'Create AI index' }] },
    });
  });

  it('clears core breadcrumbs on unmount when appChrome is unavailable', () => {
    const { core } = createServices('classic', { appChrome: undefined });

    const { unmount } = renderHook(() => useContextEngineBreadcrumbs('my-ai-index'));
    unmount();

    expect(core.chrome.setBreadcrumbs).toHaveBeenLastCalledWith([], {
      project: { value: [] },
    });
  });
});
