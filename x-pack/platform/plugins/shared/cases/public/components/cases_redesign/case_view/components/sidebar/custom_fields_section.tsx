/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CasesConfigurationUI, CaseUICustomField } from '../../../../../../common/ui';
import type { CaseUI } from '../../../../../../common';
import { CustomFields } from '../../../../case_view/components/custom_fields';
import { useSectionEdit } from '../../../../templates_v2/field_types/section_edit_context';

interface CustomFieldsSectionProps {
  isLoading: boolean;
  customFields: CaseUI['customFields'];
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
}

/** This section's id in the `SectionEditProvider` that wraps it (see `case_view_sidebar.tsx`). */
const FORM_ID = 'legacyCustomFields';

/**
 * The legacy custom fields section, edited as a group rather than one field at a time — the same
 * edit-mode contract as the template fields section, and for the same reason: each custom field
 * type owns its own form and used to persist the moment it changed, so a pass over four fields
 * wrote the case four times with no way back.
 *
 * This registers itself as a form with the section's `SectionEditProvider` (via `useSectionEdit`)
 * rather than owning its own edit-mode state and Save/Cancel bar: the wrapping
 * `SidebarAccordionSection` already renders that bar in its pinned header whenever a form is
 * registered and editing, which is what makes this section look and behave exactly like the
 * template fields one instead of a similar-looking reimplementation of it.
 */
export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  isLoading,
  customFields,
  customFieldsConfiguration,
}) => {
  const { euiTheme } = useEuiTheme();
  const sectionEdit = useSectionEdit();
  const [pendingFields, setPendingFields] = useState<Record<string, CaseUICustomField>>({});
  const [resetTokens, setResetTokens] = useState<Record<string, number>>({});

  const groupStyles = useMemo(() => css({ gap: euiTheme.size.m }), [euiTheme]);

  const modifiedKeys = useMemo(() => new Set(Object.keys(pendingFields)), [pendingFields]);
  // No provider above means no pinned Save/Cancel bar can ever appear, so there is no path back
  // out of a per-field edit — falling back to "always editable" keeps that case usable rather than
  // stranding the reader in a view they cannot leave.
  const isSectionEditing = sectionEdit ? sectionEdit.isEditing : true;

  const bufferField = useCallback((customField: CaseUICustomField) => {
    setPendingFields((previous) => ({ ...previous, [customField.key]: customField }));
  }, []);

  const bumpResetTokens = useCallback((keys: string[]) => {
    setResetTokens((previous) => {
      const next = { ...previous };
      for (const key of keys) {
        next[key] = (next[key] ?? 0) + 1;
      }
      return next;
    });
  }, []);

  const onRevertField = useCallback(
    (key: string) => {
      setPendingFields(({ [key]: _reverted, ...rest }) => rest);
      bumpResetTokens([key]);
    },
    [bumpResetTokens]
  );

  const reset = useCallback(() => {
    bumpResetTokens(Object.keys(pendingFields));
    setPendingFields({});
  }, [bumpResetTokens, pendingFields]);

  const commit = useCallback(() => setPendingFields({}), []);

  // Each field type already validates before buffering (see `custom_fields/*/edit.tsx`'s
  // InlineEdit), so whatever made it into `pendingFields` is already known-valid — collect can
  // just hand it over rather than re-validating.
  const collect = useCallback(async () => pendingFields, [pendingFields]);

  const registerForm = sectionEdit?.registerForm;
  const unregisterForm = sectionEdit?.unregisterForm;

  useEffect(() => {
    if (!registerForm || !unregisterForm) {
      return;
    }
    registerForm(FORM_ID, { changedCount: modifiedKeys.size, collect, commit, reset });
    return () => unregisterForm(FORM_ID);
  }, [registerForm, unregisterForm, modifiedKeys.size, collect, commit, reset]);

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      css={groupStyles}
      data-test-subj="legacy-custom-fields-section"
    >
      <CustomFields
        isLoading={isLoading}
        customFields={customFields}
        customFieldsConfiguration={customFieldsConfiguration}
        onSubmit={bufferField}
        editVariant="inline"
        isSectionEditing={isSectionEditing}
        onRequestSectionEdit={sectionEdit?.requestEdit}
        modifiedKeys={modifiedKeys}
        onRevertField={onRevertField}
        resetTokens={resetTokens}
      />
    </EuiFlexGroup>
  );
};

CustomFieldsSection.displayName = 'CustomFieldsSection';
