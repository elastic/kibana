/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { CaseUI } from '../../../../../../../common';
import type { CaseUICustomField } from '../../../../../../../common/ui/types';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import { useReplaceCustomField } from '../../../../../../containers/use_replace_custom_field';
import { isFieldUpdating } from '../utils/sidebar_helpers';

/**
 * Field-update actions for the "Template fields" sidebar section: custom
 * fields and template-defined extended fields. Owns its own `useOnUpdateField`
 * instance so that its loading state is independent from other sidebar
 * sections.
 */
export const useTemplateFieldsActions = ({ caseData }: { caseData: CaseUI }) => {
  const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({ caseData });
  const {
    isLoading: isUpdatingCustomField,
    mutate: replaceCustomField,
    mutateAsync: replaceCustomFieldAsync,
  } = useReplaceCustomField();

  const onSubmitCustomField = useCallback(
    (customField: CaseUICustomField) => {
      replaceCustomField({
        caseId: caseData.id,
        customFieldId: customField.key,
        customFieldValue: customField.value,
        caseVersion: caseData.version,
        caseData,
      });
    },
    [replaceCustomField, caseData]
  );

  // The legacy custom fields section's Save button: `SectionEditProvider`'s contract is one merged
  // `onSave`, but each custom field still has its own replace endpoint, so this fans out to one
  // request per changed field. That mutation already rebases on a version conflict, so the writes
  // can go out together rather than being chained.
  const onSaveCustomFields = useCallback(
    (
      values: Record<string, unknown>,
      { onSuccess, onError }: { onSuccess: () => void; onError: () => void }
    ) => {
      const changedFields = Object.values(values) as CaseUICustomField[];
      Promise.all(
        changedFields.map((customField) =>
          replaceCustomFieldAsync({
            caseId: caseData.id,
            customFieldId: customField.key,
            customFieldValue: customField.value,
            caseVersion: caseData.version,
            caseData,
          })
        )
      ).then(onSuccess, onError);
    },
    [replaceCustomFieldAsync, caseData]
  );

  const isCustomFieldsLoading = useMemo(
    () => isFieldUpdating(isLoading, loadingKey, 'customFields') || isUpdatingCustomField,
    [isLoading, loadingKey, isUpdatingCustomField]
  );

  return useMemo(
    () => ({
      onUpdateField,
      onSubmitCustomField,
      onSaveCustomFields,
      isCustomFieldsLoading,
    }),
    [onUpdateField, onSubmitCustomField, onSaveCustomFields, isCustomFieldsLoading]
  );
};
