/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from '../translations';

import type { CustomFieldTypes, CustomFieldsConfiguration } from '../../../../common/types/domain';
import { builderMap } from '../builder';
import { DeleteConfirmationModal } from '../../configure_cases/delete_confirmation_modal';

export interface Props {
  customFields: CustomFieldsConfiguration;
  onDeleteCustomField: (key: string) => void;
  onEditCustomField: (key: string) => void;
  /**
   * Renders the list as line-separated rows instead of individual panels.
   * Only used by the cases redesign settings page.
   */
  useLineSeparators?: boolean;
}

const CustomFieldsListComponent: React.FC<Props> = (props) => {
  const { customFields, onDeleteCustomField, onEditCustomField, useLineSeparators = false } = props;
  const [selectedItem, setSelectedItem] = useState<CustomFieldsConfiguration[number] | null>(null);
  const { euiTheme } = useEuiTheme();

  const redesignRowCss = useMemo(
    () => css`
      padding: ${euiTheme.size.s} 0;
      border-bottom: ${euiTheme.border.thin};
    `,
    [euiTheme]
  );

  const renderTypeLabel = (type?: CustomFieldTypes) => {
    const createdBuilder = type && builderMap[type];

    return createdBuilder && createdBuilder().label;
  };

  const onConfirm = useCallback(() => {
    if (selectedItem) {
      onDeleteCustomField(selectedItem.key);
    }

    setSelectedItem(null);
  }, [onDeleteCustomField, setSelectedItem, selectedItem]);

  const onCancel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const showModal = Boolean(selectedItem);

  const actionButtons = (customField: CustomFieldsConfiguration[number]) => (
    <>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={`${customField.key}-custom-field-edit`} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={`${customField.key}-custom-field-edit`}
            aria-label={`${customField.key}-custom-field-edit`}
            iconType="pencil"
            color="primary"
            onClick={() => onEditCustomField(customField.key)}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={`${customField.key}-custom-field-delete`} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={`${customField.key}-custom-field-delete`}
            aria-label={`${customField.key}-custom-field-delete`}
            iconType="minusCircle"
            color="danger"
            onClick={() => setSelectedItem(customField)}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </>
  );

  const fieldMeta = (customField: CustomFieldsConfiguration[number]) => (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <h4>{customField.label}</h4>
        </EuiText>
      </EuiFlexItem>
      <EuiBadge color={euiTheme.colors.body}>{renderTypeLabel(customField.type)}</EuiBadge>
      {customField.required && <EuiBadge color={euiTheme.colors.body}>{i18n.REQUIRED}</EuiBadge>}
    </EuiFlexGroup>
  );

  const redesignList = (
    <EuiFlexGroup
      justifyContent="flexStart"
      direction="column"
      gutterSize="none"
      data-test-subj="custom-fields-list"
    >
      <EuiFlexItem>
        {customFields.map((customField) => (
          <div
            key={customField.key}
            css={redesignRowCss}
            data-test-subj={`custom-field-${customField.key}-${customField.type}`}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={true}>{fieldMeta(customField)}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  {actionButtons(customField)}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ))}
      </EuiFlexItem>
      {showModal && selectedItem ? (
        <DeleteConfirmationModal
          title={i18n.DELETE_FIELD_TITLE(selectedItem.label)}
          message={i18n.DELETE_FIELD_DESCRIPTION}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </EuiFlexGroup>
  );

  const legacyList = (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart" data-test-subj="custom-fields-list">
        <EuiFlexItem>
          {customFields.map((customField) => (
            <React.Fragment key={customField.key}>
              <EuiPanel
                paddingSize="s"
                data-test-subj={`custom-field-${customField.key}-${customField.type}`}
                hasShadow={false}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={true}>{fieldMeta(customField)}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
                      {actionButtons(customField)}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </EuiFlexItem>
        {showModal && selectedItem ? (
          <DeleteConfirmationModal
            title={i18n.DELETE_FIELD_TITLE(selectedItem.label)}
            message={i18n.DELETE_FIELD_DESCRIPTION}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </EuiFlexGroup>
    </>
  );

  return customFields.length ? (useLineSeparators ? redesignList : legacyList) : null;
};

CustomFieldsListComponent.displayName = 'CustomFieldsList';

export const CustomFieldsList = React.memo(CustomFieldsListComponent);
