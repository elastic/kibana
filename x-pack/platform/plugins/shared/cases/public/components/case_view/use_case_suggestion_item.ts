/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { SuggestionItem } from '../../../common/types/domain';
import type { CaseUI } from '../../../common';
import { useCasesToast } from '../../common/use_cases_toast';
import { useRefreshCaseViewPage } from './use_on_refresh_case_view_page';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import * as i18n from '../../common/translations';

export const useCaseSuggestionItem = ({
  caseData,
  suggestion,
  setDismissedIds,
}: {
  caseData: CaseUI;
  suggestion: SuggestionItem;
  setDismissedIds: (callback: (prev: string[]) => string[]) => void;
}) => {
  const { showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const onDismissSuggestion = useCallback(() => {
    setDismissedIds((prev) => [...prev, suggestion.id]);
  }, [setDismissedIds, suggestion.id]);

  const onSuggestionAddedToCase = useCallback(() => {
    refreshCaseViewPage();
    showSuccessToast(i18n.SUGGESTION_ADDED_TO_CASE);
    onDismissSuggestion();
  }, [showSuccessToast, refreshCaseViewPage, onDismissSuggestion]);

  const { mutateAsync: createAttachments, isLoading: isAddingSuggestionToCase } =
    useCreateAttachments({
      onSuccess: onSuggestionAddedToCase,
    });

  const onAddSuggestionToCase = useCallback(() => {
    createAttachments({
      caseId: caseData.id,
      caseOwner: caseData.owner,
      attachments: suggestion.data.map((d) => d.attachment),
    });
  }, [createAttachments, caseData.id, caseData.owner, suggestion.data]);

  return { isAddingSuggestionToCase, onAddSuggestionToCase, onDismissSuggestion };
};
