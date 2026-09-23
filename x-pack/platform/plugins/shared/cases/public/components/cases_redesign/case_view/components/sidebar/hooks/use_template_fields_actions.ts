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
import { getCase } from '../../../../../../containers/api';
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
  // `onSave`, but each custom field still has its own replace endpoint (the server rejects a
  // stale `caseVersion` outright, with no server-side retry), so this fans out to one request per
  // changed field. The requests must be chained, not fired in parallel: each write bumps the
  // case's version, and `customFields` isn't in the conflict-rebase's system-managed allowlist, so
  // a sibling write still holding the pre-batch version and case snapshot gets a 409 that the
  // rebase logic correctly refuses to retry (it looks like a real concurrent edit). Re-fetching the
  // case after each write carries the version forward to the next one.
  const onSaveCustomFields = useCallback(
    async (
      values: Record<string, unknown>,
      { onSuccess, onError }: { onSuccess: () => void; onError: () => void }
    ) => {
      const changedFields = Object.values(values) as CaseUICustomField[];

      try {
        let latestCase = caseData;

        for (const customField of changedFields) {
          await replaceCustomFieldAsync({
            caseId: latestCase.id,
            customFieldId: customField.key,
            customFieldValue: customField.value,
            caseVersion: latestCase.version,
            caseData: latestCase,
          });

          if (changedFields.length > 1) {
            latestCase = await getCase({ caseId: latestCase.id });
          }
        }

        onSuccess();
      } catch {
        onError();
      }
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
