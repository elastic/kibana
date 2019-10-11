/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiBadge, EuiButtonIcon } from '@elastic/eui';

import { useState, useDispatch } from '../../../mappings_state';
import { FieldsList } from './fields_list';
import { CreateField } from './create_field';
import { DeleteFieldProvider } from './delete_field_provider';
import { NormalizedField } from '../../../types';
import { MAX_DEPTH_DEFAULT_EDITOR } from '../../../constants';

interface Props {
  field: NormalizedField;
  treeDepth?: number;
}

export const FieldsListItem = ({ field, treeDepth = 0 }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldToAddFieldTo },
    fields: { byId },
  } = useState();
  const getField = (propId: string) => byId[propId];
  const {
    id,
    source,
    childFields,
    hasChildFields,
    canHaveChildFields,
    nestedDepth,
    isExpanded,
  } = field;
  const isAddFieldBtnDisabled = field.nestedDepth === MAX_DEPTH_DEFAULT_EDITOR - 1;
  const indent = `${nestedDepth * 24}px`;
  const indentChild = `${(nestedDepth + 1) * 24}px`;

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

    return (
      <div
        style={{
          position: 'relative',
          marginTop: '-12px',
          backgroundColor: '#eee',
          padding: `12px 12px 12px ${indentChild}`,
        }}
      >
        <CreateField />
      </div>
    );
  };

  const renderActionButtons = () => {
    if (status !== 'idle') {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {canHaveChildFields && (
            <>
              <EuiButtonEmpty onClick={addField} disabled={isAddFieldBtnDisabled}>
                Add child
              </EuiButtonEmpty>
            </>
          )}
        </EuiFlexItem>
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
      <div style={{ paddingLeft: indent }} className="mappings-editor__fields-list-item__field">
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          style={{ position: 'relative', height: '56px' }}
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
          <EuiFlexItem grow={false} className="mappings-editor__fields-list-item__type">
            <EuiBadge color="hollow">{source.type}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem className="mappings-editor__fields-list-item__actions">
            {renderActionButtons()}
          </EuiFlexItem>
        </EuiFlexGroup>
        {/* {status === 'idle' && canHaveChildFields && isAddFieldBtnDisabled && (
          <p style={{ fontSize: '12px', margin: '-10px 0 6px', color: '#777' }}>
            You have reached the maximum depth for the mappings editor. Switch to the{' '}
            <EuiButtonEmpty
              onClick={() => dispatch({ type: 'documentField.changeEditor', value: 'json' })}
            >
              JSON editor
            </EuiButtonEmpty>
            to add more fields.
          </p>
        )} */}
      </div>

      {hasChildFields && isExpanded && (
        <FieldsList fields={childFields!.map(getField)} treeDepth={treeDepth + 1} />
      )}
      {renderCreateField()}
    </>
  );
};
