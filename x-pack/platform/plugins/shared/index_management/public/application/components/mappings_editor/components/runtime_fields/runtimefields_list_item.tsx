/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButtonIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedRuntimeField } from '../../types';
import { getTypeLabelFromField } from '../../lib';

import { DeleteRuntimeFieldProvider } from './delete_field_provider';
import { getListItemStyle } from '../document_fields/common/listItemStyle';

interface Props {
  field: NormalizedRuntimeField;
  areActionButtonsVisible: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  editField(): void;
}

function RuntimeFieldsListItemComponent(
  { field, areActionButtonsVisible, isHighlighted, isDimmed, editField }: Props,
  ref: React.Ref<HTMLLIElement>
) {
  const { source } = field;

  const { euiTheme } = useEuiTheme();
  const styles = getListItemStyle(euiTheme);

  const renderActionButtons = () => {
    if (!areActionButtonsVisible) {
      return null;
    }

    const editButtonLabel = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.editRuntimeFieldButtonLabel',
      {
        defaultMessage: 'Edit',
      }
    );

    const deleteButtonLabel = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.removeRuntimeFieldButtonLabel',
      {
        defaultMessage: 'Remove',
      }
    );

    return (
      <EuiFlexGroup gutterSize="s" css={styles.actions}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={editButtonLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="pencil"
              onClick={editField}
              data-test-subj="editFieldButton"
              aria-label={editButtonLabel}
            />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DeleteRuntimeFieldProvider>
            {(deleteField) => (
              <EuiToolTip content={deleteButtonLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  onClick={() => deleteField(field)}
                  data-test-subj="removeFieldButton"
                  aria-label={deleteButtonLabel}
                />
              </EuiToolTip>
            )}
          </DeleteRuntimeFieldProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <li data-test-subj="runtimeFieldsListItem">
      <div
        css={[
          styles.field,
          areActionButtonsVisible && styles.fieldEnabled,
          isHighlighted && styles.fieldHighlighted,
          isDimmed && styles.fieldDim,
        ]}
      >
        <div css={styles.wrapperIndent}>
          <EuiFlexGroup gutterSize="s" alignItems="center" css={styles.content}>
            <EuiFlexItem grow={false} data-test-subj="fieldName">
              {source.name}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="fieldType" data-type-value={source.type}>
                {getTypeLabelFromField(source)}
              </EuiBadge>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>{renderActionButtons()}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </li>
  );
}

export const RuntimeFieldsListItem = React.memo(
  RuntimeFieldsListItemComponent
) as typeof RuntimeFieldsListItemComponent;
