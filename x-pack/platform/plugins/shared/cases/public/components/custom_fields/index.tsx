/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import * as i18n from './translations';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';
import { CustomFieldsList } from './custom_fields_list';

export interface Props {
  customFields: CustomFieldsConfiguration;
  disabled: boolean;
  isLoading: boolean;
  handleAddCustomField: () => void;
  handleDeleteCustomField: (key: string) => void;
  handleEditCustomField: (key: string) => void;
  /**
   * Hides the described-form-group title/description. Used when the parent
   * (e.g. redesign SettingsSection) already provides section headings.
   */
  hideTitle?: boolean;
  /**
   * Renders the list without the surrounding subdued panel, as line-separated
   * rows. Only used by the cases redesign settings page.
   */
  useLineSeparators?: boolean;
  /** Overrides the default empty-state copy. Pass `null` to hide it. */
  emptyStateMessage?: string | null;
  /** Overrides the add-button label. */
  addButtonLabel?: string;
}
const CustomFieldsComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  handleAddCustomField,
  handleDeleteCustomField,
  handleEditCustomField,
  customFields,
  hideTitle = false,
  useLineSeparators = false,
  emptyStateMessage,
  addButtonLabel,
}) => {
  const [error, setError] = useState<boolean>(false);

  const onAddCustomField = useCallback(() => {
    if (customFields.length === MAX_CUSTOM_FIELDS_PER_CASE && !error) {
      setError(true);
      return;
    }

    handleAddCustomField();
    setError(false);
  }, [handleAddCustomField, setError, customFields, error]);

  const onEditCustomField = useCallback(
    (key: string) => {
      setError(false);
      handleEditCustomField(key);
    },
    [setError, handleEditCustomField]
  );

  if (customFields.length < MAX_CUSTOM_FIELDS_PER_CASE && error) {
    setError(false);
  }

  const listAndFooter = (
    <>
      {customFields.length ? (
        <CustomFieldsList
          customFields={customFields}
          onDeleteCustomField={handleDeleteCustomField}
          onEditCustomField={onEditCustomField}
          useLineSeparators={useLineSeparators}
        />
      ) : null}
      <EuiSpacer size="s" />
      {!customFields.length && emptyStateMessage !== null ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false} data-test-subj="empty-custom-fields">
            {emptyStateMessage ?? i18n.NO_CUSTOM_FIELDS}
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          {customFields.length < MAX_CUSTOM_FIELDS_PER_CASE ? (
            <EuiButtonEmpty
              isLoading={isLoading}
              isDisabled={disabled || error}
              size="s"
              onClick={onAddCustomField}
              iconType="plusCircle"
              data-test-subj="add-custom-field"
            >
              {addButtonLabel ?? i18n.ADD_CUSTOM_FIELD}
            </EuiButtonEmpty>
          ) : (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiText>{i18n.MAX_CUSTOM_FIELD_LIMIT(MAX_CUSTOM_FIELDS_PER_CASE)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const customFieldsContent = useLineSeparators ? (
    listAndFooter
  ) : (
    <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
      {listAndFooter}
      <EuiSpacer size="s" />
    </EuiPanel>
  );

  const content = hideTitle ? (
    customFieldsContent
  ) : (
    <EuiDescribedFormGroup
      fullWidth
      title={<h2>{i18n.TITLE}</h2>}
      description={<p>{i18n.DESCRIPTION}</p>}
      css={{ alignItems: 'flex-start' }}
    >
      {customFieldsContent}
    </EuiDescribedFormGroup>
  );

  return <div data-test-subj="custom-fields-form-group">{content}</div>;
};
CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);
