/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { isEqual } from 'lodash';
import type { CaseSeverity, CaseUI } from '../../../../../../../common';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import type { Assignee } from '../../../../../user_profiles/types';
import { isFieldUpdating } from '../utils/sidebar_helpers';

/**
 * Field-update actions for the "Attributes" sidebar section: tags, category,
 * severity, and assignees. Owns its own `useOnUpdateField` instance so that
 * its loading state is independent from other sidebar sections.
 */
export const useAttributesFieldActions = ({ caseData }: { caseData: CaseUI }) => {
  const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({ caseData });

  const assigneeUids = useMemo(
    () => caseData.assignees.map((assignee) => assignee.uid),
    [caseData.assignees]
  );

  const onSubmitTags = useCallback(
    (newTags: string[]) => onUpdateField({ key: 'tags', value: newTags }),
    [onUpdateField]
  );

  const onSubmitCategory = useCallback(
    (newCategory: string | null) => onUpdateField({ key: 'category', value: newCategory }),
    [onUpdateField]
  );

  const onUpdateSeverity = useCallback(
    (newSeverity: CaseSeverity) => onUpdateField({ key: 'severity', value: newSeverity }),
    [onUpdateField]
  );

  const onUpdateAssignees = useCallback(
    (newAssignees: Assignee[]) => {
      const newAssigneeUids = newAssignees.map((assignee) => ({ uid: assignee.uid }));
      const newUids = newAssignees.map((assignee) => assignee.uid);
      if (!isEqual([...newUids].sort(), [...assigneeUids].sort())) {
        onUpdateField({ key: 'assignees', value: newAssigneeUids });
      }
    },
    [assigneeUids, onUpdateField]
  );

  const isSeverityLoading = useMemo(
    () => isFieldUpdating(isLoading, loadingKey, 'severity'),
    [isLoading, loadingKey]
  );
  const isTagsLoading = useMemo(
    () => isFieldUpdating(isLoading, loadingKey, 'tags'),
    [isLoading, loadingKey]
  );
  const isCategoryLoading = useMemo(
    () => isFieldUpdating(isLoading, loadingKey, 'category'),
    [isLoading, loadingKey]
  );
  const isAssigneeFieldLoading = useMemo(
    () => isFieldUpdating(isLoading, loadingKey, 'assignees'),
    [isLoading, loadingKey]
  );

  return useMemo(
    () => ({
      onSubmitTags,
      onSubmitCategory,
      onUpdateSeverity,
      onUpdateAssignees,
      isSeverityLoading,
      isTagsLoading,
      isCategoryLoading,
      isAssigneeFieldLoading,
    }),
    [
      onSubmitTags,
      onSubmitCategory,
      onUpdateSeverity,
      onUpdateAssignees,
      isSeverityLoading,
      isTagsLoading,
      isCategoryLoading,
      isAssigneeFieldLoading,
    ]
  );
};
