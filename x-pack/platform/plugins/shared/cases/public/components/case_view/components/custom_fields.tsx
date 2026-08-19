/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { CasesConfigurationUI, CaseUICustomField } from '../../../../common/ui';
import type { CaseUI } from '../../../../common';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { builderMap as customFieldsBuilderMap } from '../../custom_fields/builder';
import {
  ModifiedFieldAnnouncement,
  useFieldMarkerStyles,
} from '../../templates_v2/field_types/section_edit_bar';
import * as i18n from '../../templates_v2/translations';

interface Props {
  isLoading: boolean;
  customFields: CaseUI['customFields'];
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
  onSubmit: (customField: CaseUICustomField) => void;
  /** Defaults to classic (legacy case view). Redesign passes `inline`. */
  editVariant?: 'classic' | 'inline';
  /**
   * `inline` only: whether the section (not any single field) is in edit mode. `false` renders
   * every field as a label/value row with an edit affordance instead of its editable form —
   * matching the template fields section, where clicking any field's row opens all of them at
   * once.
   */
  isSectionEditing?: boolean;
  /** `inline` only: requests that the whole section enter edit mode. */
  onRequestSectionEdit?: () => void;
  /**
   * Section edit mode: keys whose value has been changed but not yet saved. Each gets a marker and
   * its own revert control.
   */
  modifiedKeys?: ReadonlySet<string>;
  onRevertField?: (key: string) => void;
  /**
   * Bumped per key to remount that field's editor, which is how a revert or cancel reaches the
   * form state each custom field type owns internally.
   */
  resetTokens?: Readonly<Record<string, number>>;
}

const CustomFieldsComponent: React.FC<Props> = ({
  isLoading,
  customFields,
  customFieldsConfiguration,
  onSubmit,
  editVariant = 'classic',
  isSectionEditing = true,
  onRequestSectionEdit,
  modifiedKeys,
  onRevertField,
  resetTokens,
}) => {
  const { permissions } = useCasesContext();
  const { euiTheme } = useEuiTheme();
  const markerStyles = useFieldMarkerStyles();
  // Matches the template-field revert's own spacing, so a field's editor and its revert sit the
  // same distance apart in both sections.
  const revertButtonStyles = useMemo(
    () => ({ alignSelf: 'flex-start' as const, marginBlockStart: euiTheme.size.xs }),
    [euiTheme]
  );
  const onSubmitCustomField = useCallback(
    (customFieldToAdd: CaseUICustomField) => {
      onSubmit(customFieldToAdd);
    },
    [onSubmit]
  );

  const customFieldsComponents = customFieldsConfiguration.map((customFieldConf) => {
    const customFieldFactory = customFieldsBuilderMap[customFieldConf.type];
    const customFieldType = customFieldFactory().build();

    const customField = customFields.find((field) => field.key === customFieldConf.key);

    const EditComponent = customFieldType.Edit;
    const isModified = modifiedKeys?.has(customFieldConf.key) === true;

    return (
      <EuiFlexItem
        grow={false}
        data-test-subj={`case-custom-field-wrapper-${customFieldConf.key}`}
        key={customFieldConf.key}
        css={[markerStyles.row, isModified ? markerStyles.modified : undefined]}
      >
        {isModified ? <ModifiedFieldAnnouncement /> : null}
        <EditComponent
          key={`${customFieldConf.key}-${resetTokens?.[customFieldConf.key] ?? 0}`}
          isLoading={isLoading}
          canUpdate={permissions.update}
          customFieldConfiguration={customFieldConf}
          customField={customField}
          onSubmit={onSubmitCustomField}
          editVariant={editVariant}
          isSectionEditing={isSectionEditing}
          onRequestSectionEdit={onRequestSectionEdit}
        />
        {isModified && onRevertField ? (
          // Matches the template-field revert: a quiet button, not a flush link, so the only way
          // back for a single field is not missed under a filled input. `alignSelf` overrides the
          // wrapping EuiFlexItem's own `display: flex; flex-direction: column`, which otherwise
          // stretches every direct child (this button included) to the row's full width.
          <EuiButton
            size="s"
            color="primary"
            fill={false}
            iconType="editorUndo"
            onClick={() => onRevertField(customFieldConf.key)}
            css={revertButtonStyles}
            data-test-subj={`case-custom-field-revert-${customFieldConf.key}`}
          >
            {i18n.REVERT_FIELD}
          </EuiButton>
        ) : null}
      </EuiFlexItem>
    );
  });

  return <>{customFieldsComponents}</>;
};

CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);
