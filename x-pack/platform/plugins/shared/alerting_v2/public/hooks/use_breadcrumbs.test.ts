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

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'chrome') {
        return {
          docTitle: { change: mockDocTitleChange },
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
      href: '/',
    });
    expect(breadcrumbs[2]).toMatchObject({ text: 'Create' });
  });

  it('should set breadcrumbs for the edit page with root and list link', () => {
    renderHook(() => useBreadcrumbs('edit'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toHaveLength(3);
    expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
    expect(breadcrumbs[1]).toMatchObject({ text: 'Rules', href: '/' });
    expect(breadcrumbs[2]).toMatchObject({ text: 'Edit' });
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

  it('should include href on rules list breadcrumb for sub-pages', () => {
    renderHook(() => useBreadcrumbs('create'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    const rulesListBreadcrumb = breadcrumbs[1];
    expect(rulesListBreadcrumb.href).toBe('/');
  });

  it('should not include href on rules list breadcrumb when on the list page itself', () => {
    renderHook(() => useBreadcrumbs('rules_list'));

    const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
    const rulesListBreadcrumb = breadcrumbs[1];
    expect(rulesListBreadcrumb.href).toBeUndefined();
  });

  describe('notification policy pages', () => {
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
        href: '/',
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
        href: '/',
      });
      expect(breadcrumbs[2]).toMatchObject({ text: 'Edit' });
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

  describe('episode pages', () => {
    it('should set breadcrumbs for episodes_list with root', () => {
      renderHook(() => useBreadcrumbs('episodes_list'));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
      expect(breadcrumbs[1]).toMatchObject({ text: 'Alert episodes' });
    });

    it('should not include href on episodes list breadcrumb when on the list page itself', () => {
      renderHook(() => useBreadcrumbs('episodes_list'));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs[1].href).toBeUndefined();
    });

    it('should set breadcrumbs for episode_details with root, list link, and rule name', () => {
      renderHook(() => useBreadcrumbs('episode_details', { ruleName: 'My Rule' }));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toMatchObject({ text: 'Alerting V2' });
      expect(breadcrumbs[1]).toMatchObject({ text: 'Alert episodes', href: '/' });
      expect(breadcrumbs[2]).toMatchObject({ text: 'My Rule' });
    });

    it('should fall back to empty string when rule name is not provided for episode_details', () => {
      renderHook(() => useBreadcrumbs('episode_details'));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls[0][0];
      expect(breadcrumbs[2]).toMatchObject({ text: '' });
    });

    it('should set the document title for episode pages', () => {
      renderHook(() => useBreadcrumbs('episode_details', { ruleName: 'My Rule' }));

      expect(mockDocTitleChange).toHaveBeenCalledTimes(1);
      const docTitle = mockDocTitleChange.mock.calls[0][0];
      expect(docTitle).toHaveLength(3);
      expect(docTitle[0]).toBe('My Rule');
      expect(docTitle[1]).toBe('Alert episodes');
      expect(docTitle[2]).toBe('Alerting V2');
    });
  });
});
