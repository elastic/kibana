/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import classNames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiBadge, EuiButtonIcon } from '@elastic/eui';

import { useState, useDispatch } from '../../../mappings_state';
import { FieldsList } from './fields_list';
import { CreateField } from './create_field';
import { DeleteFieldProvider } from './delete_field_provider';
import { NormalizedField } from '../../../types';

interface Props {
  field: NormalizedField;
  treeDepth?: number;
}

const INDENT_SIZE = 32;

export const FieldsListItem = ({ field, treeDepth = 0 }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldToAddFieldTo, fieldToEdit },
    fields: { byId },
  } = useState();
  const getField = (propId: string) => byId[propId];
  const {
    id,
    source,
    childFields,
    canHaveChildFields,
    hasChildFields,
    canHaveMultiFields,
    hasMultiFields,
    nestedDepth,
    isExpanded,
  } = field;
  const isAddFieldBtnDisabled = false; // For now, we never disable the Add Child button.
  // const isAddFieldBtnDisabled = field.nestedDepth === MAX_DEPTH_DEFAULT_EDITOR - 1;
  const indent = `${nestedDepth * INDENT_SIZE}px`;
  const indentChild = `${(nestedDepth + 1) * INDENT_SIZE}px`;

  const addField = () => {
    dispatch({
      type: 'documentField.createField',
      value: id,
    });
  };

  const editField = () => {
    dispatch({
      type: 'documentField.editField',
      value: id,
    });
  };

  const toggleExpand = () => {
    dispatch({ type: 'field.toggleExpand', value: { fieldId: id } });
  };

  const renderCreateField = () => {
    if (status !== 'creatingField' || fieldToAddFieldTo !== id) {
      return null;
    }

    return <CreateField paddingLeft={indentChild} />;
  };

  const renderActionButtons = () => {
    if (status !== 'idle') {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        {(canHaveMultiFields || canHaveChildFields) && (
          <EuiFlexItem grow={false}>
            {canHaveChildFields && (
              <EuiButtonEmpty onClick={addField} disabled={isAddFieldBtnDisabled}>
                Add child
              </EuiButtonEmpty>
            )}
            {canHaveMultiFields && (
              <EuiButtonEmpty onClick={toggleExpand}>Multi-fields</EuiButtonEmpty>
            )}
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={editField}>Edit</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DeleteFieldProvider>
            {deleteField => (
              <EuiButtonEmpty onClick={() => deleteField(field)}>Remove</EuiButtonEmpty>
            )}
          </DeleteFieldProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <>
      <div
        style={{ paddingLeft: indent }}
        className={classNames('mappings-editor__fields-list-item__field', {
          'mappings-editor__fields-list-item__field--selected': fieldToEdit === id,
          'mappings-editor__fields-list-item__field--dim':
            status === 'editingField' && fieldToEdit !== id,
        })}
      >
        <div className="mappings-editor__fields-list-item__wrapper">
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            className={classNames('mappings-editor__fields-list-item__content', {
              'mappings-editor__fields-list-item__content--toggle': hasChildFields,
            })}
          >
            <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__toggle">
              {hasChildFields && (
                <EuiButtonIcon
                  color="text"
                  onClick={toggleExpand}
                  iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                  aria-label={`Expand field ${source.name}`}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__name">
              {source.name}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{source.type}</EuiBadge>
            </EuiFlexItem>
            {hasMultiFields && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{`${childFields!.length} multi-field`}</EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem className="mappings-editor__fields-list-item__actions">
              {renderActionButtons()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>

      {hasChildFields && isExpanded && (
        <FieldsList fields={childFields!.map(getField)} treeDepth={treeDepth + 1} />
      )}

      {renderCreateField()}
    </>
  );
};
