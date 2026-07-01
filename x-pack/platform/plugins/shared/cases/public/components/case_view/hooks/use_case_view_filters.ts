/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import type { CaseUI } from '../../../../common';
import { getAttachmentAuthorKey } from '../components/helpers';

export interface CaseViewFiltersParams {
  selectedAttachmentTypes: string[];
  setSelectedAttachmentTypes: (next: string[]) => void;
  selectedAuthors: string[];
  setSelectedAuthors: (next: string[]) => void;
}

export interface CaseViewFiltersResult extends CaseViewFiltersParams {
  filteredCaseData: CaseUI;
  isTypeVisible: (typeId: string) => boolean;
  isTypeFilterActive: boolean;
  isAuthorFilterActive: boolean;
  hasActiveFilter: boolean;
  clearFilters: () => void;
}

/**
 * Owns the attachment-type and author filter state for a case view, plus the
 * derived `filteredCaseData` consumers usually want to feed into their
 * per-accordion / per-list views.
 */
export const useCaseViewFilters = (caseData: CaseUI): CaseViewFiltersResult => {
  const [selectedAttachmentTypes, setSelectedAttachmentTypes] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);

  const isTypeFilterActive = selectedAttachmentTypes.length > 0;
  const isAuthorFilterActive = selectedAuthors.length > 0;
  const hasActiveFilter = isTypeFilterActive || isAuthorFilterActive;

  const filteredCaseData = useMemo<CaseUI>(() => {
    if (!isAuthorFilterActive) return caseData;
    const selected = new Set(selectedAuthors);
    return {
      ...caseData,
      comments: caseData.comments.filter((comment) =>
        selected.has(getAttachmentAuthorKey(comment.createdBy))
      ),
    };
  }, [caseData, selectedAuthors, isAuthorFilterActive]);

  const isTypeVisible = useCallback(
    (typeId: string) => !isTypeFilterActive || selectedAttachmentTypes.includes(typeId),
    [selectedAttachmentTypes, isTypeFilterActive]
  );

  const clearFilters = useCallback(() => {
    setSelectedAttachmentTypes([]);
    setSelectedAuthors([]);
  }, []);

  return {
    selectedAttachmentTypes,
    setSelectedAttachmentTypes,
    selectedAuthors,
    setSelectedAuthors,
    filteredCaseData,
    isTypeVisible,
    isTypeFilterActive,
    isAuthorFilterActive,
    hasActiveFilter,
    clearFilters,
  };
};
