/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import classNames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedField } from '../../../types';
import { TYPE_DEFINITION } from '../../../constants';
import { DeleteFieldProvider } from './delete_field_provider';

interface Props {
  field: NormalizedField;
  areActionButtonsVisible: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  addField(): void;
  editField(): void;
}

export const FieldsListItemFlat = React.memo(function FieldListItemFlatComponent({
  field,
  areActionButtonsVisible,
  isHighlighted,
  isDimmed,
  addField,
  editField,
}: Props) {
  const { source, isMultiField, canHaveChildFields, hasChildFields, hasMultiFields } = field;

  const renderActionButtons = () => {
    if (!areActionButtonsVisible) {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        {canHaveChildFields && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={addField} data-test-subj="addChildButton">
              {i18n.translate('xpack.idxMgmt.mappingsEditor.addChildButtonLabel', {
                defaultMessage: 'Add child',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={editField} data-test-subj="editFieldButton">
            {i18n.translate('xpack.idxMgmt.mappingsEditor.editFieldButtonLabel', {
              defaultMessage: 'Edit',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DeleteFieldProvider>
            {deleteField => (
              <EuiButtonEmpty onClick={() => deleteField(field)} data-test-subj="removeFieldButton">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.removeFieldButtonLabel', {
                  defaultMessage: 'Remove',
                })}
              </EuiButtonEmpty>
            )}
          </DeleteFieldProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <li className={classNames('mappingsEditor__fieldsListItem')} data-test-subj="fieldsListItem">
      <div
        className={classNames('mappingsEditor__fieldsListItem__field', {
          'mappingsEditor__fieldsListItem__field--enabled': areActionButtonsVisible,
          'mappingsEditor__fieldsListItem__field--selected': isHighlighted,
          'mappingsEditor__fieldsListItem__field--dim': isDimmed,
        })}
      >
        <div className={classNames('mappingsEditor__fieldsListItem__wrapper')}>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            className={classNames('mappingsEditor__fieldsListItem__content', {
              'mappingsEditor__fieldsListItem__content--toggle': hasChildFields || hasMultiFields,
              'mappingsEditor__fieldsListItem__content--multiField': isMultiField,
            })}
          >
            <EuiFlexItem grow={false} className="mappingsEditor__fieldsListItem__name">
              {source.name}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {isMultiField
                  ? i18n.translate('xpack.idxMgmt.mappingsEditor.multiFieldBadgeLabel', {
                      defaultMessage: '{dataType} multi-field',
                      values: {
                        dataType: TYPE_DEFINITION[source.type].label,
                      },
                    })
                  : TYPE_DEFINITION[source.type].label}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem className="mappingsEditor__fieldsListItem__actions">
              {renderActionButtons()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </li>
  );
});
