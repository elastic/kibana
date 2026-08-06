/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CasesConfigurationUI, CaseUICustomField } from '../../../../../../common/ui';
import type { CaseUI } from '../../../../../../common';
import { CustomFields } from '../../../../case_view/components/custom_fields';
import {
  SectionEditBar,
  useSectionEditingStyles,
} from '../../../../templates_v2/field_types/section_edit_bar';

interface CustomFieldsSectionProps {
  isLoading: boolean;
  customFields: CaseUI['customFields'];
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
  onSubmit: (customField: CaseUICustomField) => void;
}

/**
 * The legacy custom fields section, edited as a group rather than one field at a time.
 *
 * Each custom field type owns its own form and used to persist the moment it changed, so a pass over
 * four fields wrote the case four times with no way back. Here the edits are buffered instead: the
 * section enters edit mode on the first change, and Save flushes the buffer. A revert (or Cancel)
 * remounts the affected editors, which is the only way to reset form state these components keep to
 * themselves.
 */
export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  isLoading,
  customFields,
  customFieldsConfiguration,
  onSubmit,
}) => {
  const { euiTheme } = useEuiTheme();
  const editingStyles = useSectionEditingStyles();
  const [pendingFields, setPendingFields] = useState<Record<string, CaseUICustomField>>({});
  const [resetTokens, setResetTokens] = useState<Record<string, number>>({});

  const groupStyles = useMemo(() => css({ gap: euiTheme.size.m }), [euiTheme]);

  const modifiedKeys = useMemo(() => new Set(Object.keys(pendingFields)), [pendingFields]);
  const isEditing = modifiedKeys.size > 0;

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

  const onCancel = useCallback(() => {
    bumpResetTokens(Object.keys(pendingFields));
    setPendingFields({});
  }, [bumpResetTokens, pendingFields]);

  const onSave = useCallback(() => {
    // Each field has its own replace endpoint, and that mutation already rebases on a version
    // conflict, so the writes can go out together rather than being chained.
    Object.values(pendingFields).forEach(onSubmit);
    setPendingFields({});
  }, [onSubmit, pendingFields]);

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      color="transparent"
      paddingSize={isEditing ? 's' : 'none'}
      css={isEditing ? editingStyles : undefined}
      data-test-subj="legacy-custom-fields-section"
    >
      <EuiFlexGroup direction="column" responsive={false} css={groupStyles}>
        <CustomFields
          isLoading={isLoading}
          customFields={customFields}
          customFieldsConfiguration={customFieldsConfiguration}
          onSubmit={bufferField}
          editVariant="inline"
          modifiedKeys={modifiedKeys}
          onRevertField={onRevertField}
          resetTokens={resetTokens}
        />
      </EuiFlexGroup>
      {isEditing ? (
        <SectionEditBar
          changedCount={modifiedKeys.size}
          isSaving={isLoading}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : null}
    </EuiPanel>
  );
};

CustomFieldsSection.displayName = 'CustomFieldsSection';
