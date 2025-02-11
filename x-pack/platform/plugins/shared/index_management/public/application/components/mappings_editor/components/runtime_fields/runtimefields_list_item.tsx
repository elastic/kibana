/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedRuntimeField } from '../../types';
import { getTypeLabelFromField } from '../../lib';

import { DeleteRuntimeFieldProvider } from './delete_field_provider';

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
      <EuiFlexGroup gutterSize="s" className="mappingsEditor__fieldsListItem__actions">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={editButtonLabel}>
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
              <EuiToolTip content={deleteButtonLabel}>
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
    <li className="mappingsEditor__fieldsListItem" data-test-subj="runtimeFieldsListItem">
      <div
        className={classNames('mappingsEditor__fieldsListItem__field', {
          'mappingsEditor__fieldsListItem__field--enabled': areActionButtonsVisible,
          'mappingsEditor__fieldsListItem__field--highlighted': isHighlighted,
          'mappingsEditor__fieldsListItem__field--dim': isDimmed,
        })}
      >
        <div className="mappingsEditor__fieldsListItem__wrapper mappingsEditor__fieldsListItem__wrapper--indent">
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            className="mappingsEditor__fieldsListItem__content"
          >
            <EuiFlexItem
              grow={false}
              className="mappingsEditor__fieldsListItem__name"
              data-test-subj="fieldName"
            >
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
