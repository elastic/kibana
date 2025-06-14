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
  EuiButtonIcon,
  EuiBadge,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SearchResult } from '../../../types';
import { TYPE_DEFINITION } from '../../../constants';
import { useDispatch } from '../../../mappings_state_context';
import { getTypeLabelFromField } from '../../../lib';
import { DeleteFieldProvider } from '../fields/delete_field_provider';
import { getListItemStyle } from '../common/listItemStyle';

interface Props {
  item: SearchResult;
  areActionButtonsVisible: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
}

export const SearchResultItem = React.memo(function FieldListItemFlatComponent({
  item: { display, field },
  areActionButtonsVisible,
  isHighlighted,
  isDimmed,
}: Props) {
  const dispatch = useDispatch();
  const { source, isMultiField } = field;
  const { euiTheme } = useEuiTheme();
  const styles = getListItemStyle(euiTheme);

  const editField = () => {
    dispatch({
      type: 'documentField.editField',
      value: field.id,
    });
  };

  const renderActionButtons = () => {
    if (!areActionButtonsVisible) {
      return null;
    }

    const editButtonLabel = i18n.translate('xpack.idxMgmt.mappingsEditor.editFieldButtonLabel', {
      defaultMessage: 'Edit',
    });

    const deleteButtonLabel = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.removeFieldButtonLabel',
      {
        defaultMessage: 'Remove',
      }
    );

    return (
      <EuiFlexGroup gutterSize="s" css={styles.actions} data-test-subj="fieldActions">
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
          <DeleteFieldProvider>
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
          </DeleteFieldProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <div data-test-subj="fieldsListItem">
      <div
        css={[
          styles.field,
          areActionButtonsVisible && styles.fieldEnabled,
          isHighlighted && styles.fieldHighlighted,
          isDimmed && styles.fieldDim,
        ]}
      >
        <div css={styles.wrapper}>
          <EuiFlexGroup gutterSize="s" alignItems="center" css={styles.content} tabIndex={0}>
            <EuiFlexItem grow={false} data-test-subj="fieldName">
              {display}
            </EuiFlexItem>

            <EuiFlexItem grow={false} data-test-subj="fieldType">
              <EuiBadge color="hollow">
                {isMultiField
                  ? i18n.translate('xpack.idxMgmt.mappingsEditor.multiFieldBadgeLabel', {
                      defaultMessage: '{dataType} multi-field',
                      values: {
                        dataType: TYPE_DEFINITION[source.type]?.label ?? source.type,
                      },
                    })
                  : getTypeLabelFromField(source)}
              </EuiBadge>
            </EuiFlexItem>

            <EuiFlexItem>{renderActionButtons()}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </div>
  );
});

SearchResultItem.displayName = 'SearchResultItem'; // display name required for tests to work with React.memo
