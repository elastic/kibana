/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { renderHook } from '@testing-library/react';
import { CONTEXT_ENGINE_APP_PATH } from '../../../common/features';
import { createSearchNavigationMock } from '../test_utils/search_navigation_mock';
import { useContextEngineBreadcrumbs } from './use_context_engine_breadcrumbs';

const mockUseKibana = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

describe('useContextEngineBreadcrumbs', () => {
  const createServices = (
    chromeStyle: 'classic' | 'project' = 'classic',
    { basePath = '' }: { basePath?: string } = {}
  ) => {
    const core = coreMock.createStart({ basePath });
    const searchNavigation = createSearchNavigationMock();

    core.chrome.getChromeStyle.mockReturnValue(chromeStyle);

    mockUseKibana.mockReturnValue({
      services: {
        http: core.http,
        searchNavigation,
        chrome: core.chrome,
      },
    });

    return { core, searchNavigation };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets Build > Context breadcrumbs in classic chrome without a page name', () => {
    const { searchNavigation } = createServices('classic');

    renderHook(() => useContextEngineBreadcrumbs());

    expect(searchNavigation.breadcrumbs.setSearchBreadCrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: undefined },
    ]);
  });

  it('adds a link on Context and appends the page name in classic chrome', () => {
    const { searchNavigation } = createServices('classic');

    renderHook(() => useContextEngineBreadcrumbs('my-ai-index'));

    expect(searchNavigation.breadcrumbs.setSearchBreadCrumbs).toHaveBeenCalledWith([
      { text: 'Build' },
      { text: 'Context', href: CONTEXT_ENGINE_APP_PATH },
      { text: 'my-ai-index' },
    ]);
  });

  it('only sets the page name breadcrumb in project chrome', () => {
    const { searchNavigation } = createServices('project');

    renderHook(() => useContextEngineBreadcrumbs('Create AI index'));

    expect(searchNavigation.breadcrumbs.setSearchBreadCrumbs).toHaveBeenCalledWith([
      { text: 'Create AI index' },
    ]);
  });

  it('does not set breadcrumbs in project chrome when there is no page name', () => {
    const { searchNavigation } = createServices('project');

    renderHook(() => useContextEngineBreadcrumbs());

    expect(searchNavigation.breadcrumbs.setSearchBreadCrumbs).not.toHaveBeenCalled();
  });

  it('clears breadcrumbs on unmount', () => {
    const { searchNavigation } = createServices('classic');

    const { unmount } = renderHook(() => useContextEngineBreadcrumbs('my-ai-index'));
    unmount();

    expect(searchNavigation.breadcrumbs.clearBreadcrumbs).toHaveBeenCalled();
  });

  it('updates breadcrumbs when the page name changes', () => {
    const { searchNavigation } = createServices('classic');

    const { rerender } = renderHook(
      ({ pageName }: { pageName?: string }) => useContextEngineBreadcrumbs(pageName),
      { initialProps: { pageName: 'first' } }
    );

    rerender({ pageName: 'second' });

    expect(searchNavigation.breadcrumbs.setSearchBreadCrumbs).toHaveBeenLastCalledWith([
      { text: 'Build' },
      { text: 'Context', href: CONTEXT_ENGINE_APP_PATH },
      { text: 'second' },
    ]);
  });

  it('does not throw when searchNavigation is unavailable', () => {
    const core = coreMock.createStart();
    core.chrome.getChromeStyle.mockReturnValue('classic');

    mockUseKibana.mockReturnValue({
      services: {
        http: core.http,
        searchNavigation: undefined,
        chrome: core.chrome,
      },
    });

    expect(() => renderHook(() => useContextEngineBreadcrumbs('my-ai-index'))).not.toThrow();
  });
});
