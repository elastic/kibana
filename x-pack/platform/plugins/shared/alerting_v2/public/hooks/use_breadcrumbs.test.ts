/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useBreadcrumbs } from './use_breadcrumbs';
import { useService, CoreStart } from '@kbn/core-di-browser';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

describe('useBreadcrumbs', () => {
  const mockSetBreadcrumbs = jest.fn();
  const mockDocTitleChange = jest.fn();
  const mockGetUrlForApp = jest
    .fn()
    .mockReturnValue('/app/management/insightsAndAlerting/alerting_v2');
  const mockNavigateToUrl = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockReturnValue('/app/management/insightsAndAlerting/alerting_v2');

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'chrome') {
        return {
          setBreadcrumbs: mockSetBreadcrumbs,
          docTitle: { change: mockDocTitleChange },
        } as any;
      }
      if (service === 'application') {
        return {
          getUrlForApp: mockGetUrlForApp,
          navigateToUrl: mockNavigateToUrl,
        } as any;
      }
      return undefined as any;
    });
  });

  it('should set breadcrumbs for the rules_list page', () => {
    renderHook(() => useBreadcrumbs('rules_list'));

    expect(mockSetBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      expect.objectContaining({ text: expect.any(String) }),
    ]);
  });

  it('should set breadcrumbs for the create page with a list link', () => {
    renderHook(() => useBreadcrumbs('create'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0]).toMatchObject({
      href: '/app/management/insightsAndAlerting/alerting_v2',
      onClick: expect.any(Function),
    });
    expect(breadcrumbs[1]).toMatchObject({ text: expect.any(String) });
  });

  it('should set breadcrumbs for the edit page with a list link', () => {
    renderHook(() => useBreadcrumbs('edit'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0].href).toBe('/app/management/insightsAndAlerting/alerting_v2');
  });

  it('should set breadcrumbs for rule_details with the rule name', () => {
    renderHook(() => useBreadcrumbs('rule_details', { ruleName: 'My Rule' }));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[1]).toMatchObject({ text: 'My Rule' });
  });

  it('should fall back to empty string when rule name is not provided for rule_details', () => {
    renderHook(() => useBreadcrumbs('rule_details'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs[1]).toMatchObject({ text: '' });
  });

  it('should set the document title from breadcrumbs in reverse order', () => {
    renderHook(() => useBreadcrumbs('create'));

    expect(mockDocTitleChange).toHaveBeenCalledTimes(1);
    const docTitle = mockDocTitleChange.mock.calls[0][0];
    expect(Array.isArray(docTitle)).toBe(true);
    // The create page has 2 breadcrumbs, so doc title should have 2 entries reversed
    expect(docTitle).toHaveLength(2);
  });

  it('should call navigateToUrl when a breadcrumb link is clicked', () => {
    renderHook(() => useBreadcrumbs('create'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    const listBreadcrumb = breadcrumbs[0];

    listBreadcrumb.onClick({
      preventDefault: jest.fn(),
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
    });

    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/app/management/insightsAndAlerting/alerting_v2'
    );
  });

  it('should not navigate when a modifier key is held', () => {
    renderHook(() => useBreadcrumbs('create'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    const listBreadcrumb = breadcrumbs[0];
    const preventDefault = jest.fn();

    listBreadcrumb.onClick({
      preventDefault,
      metaKey: true,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockNavigateToUrl).not.toHaveBeenCalled();
  });
});
