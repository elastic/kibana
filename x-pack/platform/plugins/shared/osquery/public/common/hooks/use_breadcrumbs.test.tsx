/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useBreadcrumbs } from './use_breadcrumbs';

const mockSetBreadcrumbs = jest.fn();
const mockDocTitleChange = jest.fn();
const mockPrepend = jest.fn((path: string) => path);

jest.mock('../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      chrome: {
        setBreadcrumbs: mockSetBreadcrumbs,
        docTitle: { change: mockDocTitleChange },
      },
      http: { basePath: { prepend: mockPrepend } },
      application: { navigateToUrl: jest.fn() },
    },
  }),
}));

const lastBreadcrumbText = () => {
  const breadcrumbs = mockSetBreadcrumbs.mock.calls.at(-1)?.[0] ?? [];

  return breadcrumbs.at(-1)?.text;
};

describe('useBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pack_edit', () => {
    it('should end with "Edit" when the user can write packs', () => {
      renderHook(() => useBreadcrumbs('pack_edit', { packName: 'my-pack', isReadOnly: false }));

      expect(lastBreadcrumbText()).toBe('Edit');
    });

    it('should end with "View" when the pack page is read-only', () => {
      renderHook(() => useBreadcrumbs('pack_edit', { packName: 'my-pack', isReadOnly: true }));

      expect(lastBreadcrumbText()).toBe('View');
    });

    it('should default to "Edit" when isReadOnly is omitted', () => {
      renderHook(() => useBreadcrumbs('pack_edit', { packName: 'my-pack' }));

      expect(lastBreadcrumbText()).toBe('Edit');
    });

    it('should include the pack name as the preceding crumb', () => {
      renderHook(() => useBreadcrumbs('pack_edit', { packName: 'my-pack', isReadOnly: true }));

      const breadcrumbs = mockSetBreadcrumbs.mock.calls.at(-1)?.[0] ?? [];
      expect(breadcrumbs.at(-2)?.text).toBe('my-pack');
    });

    it('should set the doc title from the reversed breadcrumb trail', () => {
      renderHook(() => useBreadcrumbs('pack_edit', { packName: 'my-pack', isReadOnly: true }));

      expect(mockDocTitleChange).toHaveBeenLastCalledWith(['View', 'my-pack', 'Packs', 'Osquery']);
    });
  });
});
