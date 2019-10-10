/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';

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

const inlineStyle = {
  borderBottom: '1px solid #ddd',
  display: 'flex',
  flexDirection: 'column' as 'column',
};

export const FieldsListItem = ({ field, treeDepth = 0 }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldToAddFieldTo },
    fields: { byId },
  } = useState();
  const getField = (propId: string) => byId[propId];
  const { id, source, childFields, hasChildFields, canHaveChildFields } = field;
  const isAddFieldBtnDisabled = field.nestedDepth === MAX_DEPTH_DEFAULT_EDITOR - 1;

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

  const renderCreateField = () => {
    if (status !== 'creatingField') {
      return null;
    }

    // Root level (0) has does not have the "fieldToAddFieldTo" set
    if (fieldToAddFieldTo !== id) {
      return null;
    }

    return (
      <div style={{ paddingLeft: '20px' }}>
        <CreateField />
      </div>
    );
  };

  const renderActionButtons = () => {
    if (status !== 'idle') {
      return null;
    }

    return (
      <>
        <EuiButton onClick={editField}>Edit</EuiButton>
        {canHaveChildFields && (
          <>
            <EuiButton onClick={addField} disabled={isAddFieldBtnDisabled}>
              Add field
            </EuiButton>
          </>
        )}
        <DeleteFieldProvider>
          {deleteField => <EuiButton onClick={() => deleteField(field)}>Remove</EuiButton>}
        </DeleteFieldProvider>
      </>
    );
  };

  return (
    <>
      <div style={inlineStyle}>
        <div style={{ display: 'flex', alignItems: 'center', height: '82px' }}>
          {source.name} | {source.type} {renderActionButtons()}
        </div>
        {status === 'idle' && canHaveChildFields && isAddFieldBtnDisabled && (
          <p style={{ fontSize: '12px', margin: '-10px 0 6px', color: '#777' }}>
            You have reached the maximum depth for the mappings editor. Switch to the{' '}
            <EuiButtonEmpty
              onClick={() => dispatch({ type: 'documentField.changeEditor', value: 'json' })}
            >
              JSON editor
            </EuiButtonEmpty>
            to add more fields.
          </p>
        )}
      </div>

      {renderCreateField()}

      {hasChildFields && (
        <div style={{ paddingLeft: '20px' }}>
          <FieldsList fields={childFields!.map(getField)} treeDepth={treeDepth + 1} />
        </div>
      )}
    </>
  );
};
