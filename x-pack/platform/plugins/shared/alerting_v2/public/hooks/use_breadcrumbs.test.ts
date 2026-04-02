/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useBreadcrumbs } from './use_breadcrumbs';
import { useService, CoreStart } from '@kbn/core-di-browser';

const mockSetBreadcrumbs = jest.fn();
jest.mock('../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => mockSetBreadcrumbs,
}));

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

describe('useBreadcrumbs', () => {
  const mockDocTitleChange = jest.fn();
  const mockGetUrlForApp = jest.fn().mockReturnValue('/app/management/alertingV2/rules');
  const mockNavigateToUrl = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockReturnValue('/app/management/alertingV2/rules');

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'chrome') {
        return {
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

  it('should set breadcrumbs for the rules_list page with root', () => {
    renderHook(() => useBreadcrumbs('rules_list'));

    expect(mockSetBreadcrumbs).toHaveBeenCalledTimes(1);
    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
    expect(breadcrumbs[1]).toMatchObject({ text: 'Rules' });
  });

  it('should set breadcrumbs for the create page with root and list link', () => {
    renderHook(() => useBreadcrumbs('create'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
    expect(breadcrumbs[1]).toMatchObject({
      text: 'Rules',
      href: '/app/management/alertingV2/rules',
      onClick: expect.any(Function),
    });
    expect(breadcrumbs[2]).toMatchObject({ text: 'Create' });
  });

  it('should set breadcrumbs for the edit page with root and list link', () => {
    renderHook(() => useBreadcrumbs('edit'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
    expect(breadcrumbs[1].href).toBe('/app/management/alertingV2/rules');
  });

  it('should set breadcrumbs for rule_details with the rule name', () => {
    renderHook(() => useBreadcrumbs('rule_details', { ruleName: 'My Rule' }));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
    expect(breadcrumbs[1]).toMatchObject({ text: 'Rules' });
    expect(breadcrumbs[2]).toMatchObject({ text: 'My Rule' });
  });

  it('should fall back to empty string when rule name is not provided for rule_details', () => {
    renderHook(() => useBreadcrumbs('rule_details'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs[2]).toMatchObject({ text: '' });
  });

  it('should set the document title from breadcrumbs in reverse order', () => {
    renderHook(() => useBreadcrumbs('create'));

    expect(mockDocTitleChange).toHaveBeenCalledTimes(1);
    const docTitle = mockDocTitleChange.mock.calls[0][0];
    expect(Array.isArray(docTitle)).toBe(true);
    expect(docTitle).toHaveLength(3);
  });

  it('should call navigateToUrl when a breadcrumb link is clicked', () => {
    renderHook(() => useBreadcrumbs('create'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    const rulesListBreadcrumb = breadcrumbs[1];

    rulesListBreadcrumb.onClick({
      preventDefault: jest.fn(),
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
    });

    expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/management/alertingV2/rules');
  });

  it('should not navigate when a modifier key is held', () => {
    renderHook(() => useBreadcrumbs('create'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    const rulesListBreadcrumb = breadcrumbs[1];
    const preventDefault = jest.fn();

    rulesListBreadcrumb.onClick({
      preventDefault,
      metaKey: true,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockNavigateToUrl).not.toHaveBeenCalled();
  });

  describe('notification policy pages', () => {
    beforeEach(() => {
      mockGetUrlForApp.mockImplementation((_appId: string, opts?: { path?: string }) => {
        if (opts?.path && opts.path.includes('notification_policies')) {
          return '/app/management/alertingV2/notification_policies';
        }
        return '/app/management/alertingV2/rules';
      });
    });

    it('should set breadcrumbs for notification_policies_list with root', () => {
      renderHook(() => useBreadcrumbs('notification_policies_list'));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
      expect(breadcrumbs[1]).toMatchObject({ text: 'Notification Policies' });
    });

    it('should set breadcrumbs for notification_policy_create with root and list link', () => {
      renderHook(() => useBreadcrumbs('notification_policy_create'));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
      expect(breadcrumbs[1]).toMatchObject({
        text: 'Notification Policies',
        href: '/app/management/alertingV2/notification_policies',
        onClick: expect.any(Function),
      });
      expect(breadcrumbs[2]).toMatchObject({ text: 'Create' });
    });

    it('should set breadcrumbs for notification_policy_edit with root and list link', () => {
      renderHook(() => useBreadcrumbs('notification_policy_edit'));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
      expect(breadcrumbs[1]).toMatchObject({
        text: 'Notification Policies',
        href: '/app/management/alertingV2/notification_policies',
      });
      expect(breadcrumbs[2]).toMatchObject({ text: 'Edit' });
    });

    it('should navigate to notification policies list when breadcrumb link is clicked', () => {
      renderHook(() => useBreadcrumbs('notification_policy_create'));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      const policiesListBreadcrumb = breadcrumbs[1];

      policiesListBreadcrumb.onClick({
        preventDefault: jest.fn(),
        metaKey: false,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
      });

      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        '/app/management/alertingV2/notification_policies'
      );
    });

    it('should set the document title for notification policy pages', () => {
      renderHook(() => useBreadcrumbs('notification_policy_create'));

      expect(mockDocTitleChange).toHaveBeenCalledTimes(1);
      const docTitle = mockDocTitleChange.mock.calls[0][0];
      expect(docTitle).toHaveLength(3);
      expect(docTitle[0]).toBe('Create');
      expect(docTitle[1]).toBe('Notification Policies');
      expect(docTitle[2]).toBe('Alerting V2');
    });
  });
});
