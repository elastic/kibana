/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import type { CaseUI } from '../../../../common';
import { basicCase, basicComment, elasticUser } from '../../../containers/mock';
import { useCaseViewFilters } from './use_case_view_filters';

const otherUser = {
  fullName: 'Ron Swanson',
  username: 'rswanson',
  email: 'ron.swanson@elastic.co',
};

const caseWithTwoAuthors: CaseUI = {
  ...basicCase,
  comments: [
    { ...basicComment, id: 'c-1', createdBy: elasticUser },
    { ...basicComment, id: 'c-2', createdBy: otherUser },
  ],
};

describe('useCaseViewFilters', () => {
  it('returns inactive flags and the input caseData by default', () => {
    const { result } = renderHook(() => useCaseViewFilters(basicCase));

    expect(result.current.selectedAttachmentTypes).toEqual([]);
    expect(result.current.selectedAuthors).toEqual([]);
    expect(result.current.isTypeFilterActive).toBe(false);
    expect(result.current.isAuthorFilterActive).toBe(false);
    expect(result.current.hasActiveFilter).toBe(false);
    expect(result.current.filteredCaseData).toBe(basicCase);
  });

  it('isTypeVisible returns true for every id when no type is selected', () => {
    const { result } = renderHook(() => useCaseViewFilters(basicCase));

    expect(result.current.isTypeVisible('anything')).toBe(true);
    expect(result.current.isTypeVisible('user')).toBe(true);
  });

  describe('attachment type filter', () => {
    it('flips isTypeFilterActive and narrows isTypeVisible when types are selected', () => {
      const { result } = renderHook(() => useCaseViewFilters(basicCase));

      act(() => {
        result.current.setSelectedAttachmentTypes(['user']);
      });

      expect(result.current.isTypeFilterActive).toBe(true);
      expect(result.current.hasActiveFilter).toBe(true);
      expect(result.current.isTypeVisible('user')).toBe(true);
      expect(result.current.isTypeVisible('alert')).toBe(false);
    });

    it('clearing the selection restores the inactive state', () => {
      const { result } = renderHook(() => useCaseViewFilters(basicCase));

      act(() => {
        result.current.setSelectedAttachmentTypes(['user']);
      });
      act(() => {
        result.current.setSelectedAttachmentTypes([]);
      });

      expect(result.current.isTypeFilterActive).toBe(false);
      expect(result.current.hasActiveFilter).toBe(false);
      expect(result.current.isTypeVisible('alert')).toBe(true);
    });

    it('does not mutate caseData when only the type filter is active', () => {
      const { result } = renderHook(() => useCaseViewFilters(basicCase));

      act(() => {
        result.current.setSelectedAttachmentTypes(['user']);
      });

      expect(result.current.filteredCaseData).toBe(basicCase);
    });
  });

  describe('author filter', () => {
    it('filters comments down to the selected author', () => {
      const { result } = renderHook(() => useCaseViewFilters(caseWithTwoAuthors));

      act(() => {
        result.current.setSelectedAuthors([elasticUser.username]);
      });

      expect(result.current.isAuthorFilterActive).toBe(true);
      expect(result.current.hasActiveFilter).toBe(true);
      expect(result.current.filteredCaseData.comments).toHaveLength(1);
      expect(result.current.filteredCaseData.comments[0].id).toBe('c-1');
    });

    it('supports multiple selected authors', () => {
      const { result } = renderHook(() => useCaseViewFilters(caseWithTwoAuthors));

      act(() => {
        result.current.setSelectedAuthors([elasticUser.username, otherUser.username]);
      });

      expect(result.current.filteredCaseData.comments).toHaveLength(2);
    });

    it('clearing the selection restores the original caseData reference', () => {
      const { result } = renderHook(() => useCaseViewFilters(caseWithTwoAuthors));

      act(() => {
        result.current.setSelectedAuthors([elasticUser.username]);
      });
      act(() => {
        result.current.setSelectedAuthors([]);
      });

      expect(result.current.isAuthorFilterActive).toBe(false);
      expect(result.current.filteredCaseData).toBe(caseWithTwoAuthors);
    });

    it('drops comments whose author has no resolvable key when filter is active', () => {
      const caseWithUnknownAuthor: CaseUI = {
        ...basicCase,
        comments: [
          { ...basicComment, id: 'c-known', createdBy: elasticUser },
          {
            ...basicComment,
            id: 'c-unknown',
            createdBy: { fullName: null, username: null, email: null },
          },
        ],
      };

      const { result } = renderHook(() => useCaseViewFilters(caseWithUnknownAuthor));

      act(() => {
        result.current.setSelectedAuthors([elasticUser.username]);
      });

      expect(result.current.filteredCaseData.comments.map((c) => c.id)).toEqual(['c-known']);
    });
  });

  it('type and author filters compose: hasActiveFilter reflects either being active', () => {
    const { result } = renderHook(() => useCaseViewFilters(caseWithTwoAuthors));

    act(() => {
      result.current.setSelectedAttachmentTypes(['user']);
      result.current.setSelectedAuthors([elasticUser.username]);
    });

    expect(result.current.isTypeFilterActive).toBe(true);
    expect(result.current.isAuthorFilterActive).toBe(true);
    expect(result.current.hasActiveFilter).toBe(true);
    expect(result.current.isTypeVisible('user')).toBe(true);
    expect(result.current.isTypeVisible('alert')).toBe(false);
    expect(result.current.filteredCaseData.comments.map((c) => c.id)).toEqual(['c-1']);
  });
});
