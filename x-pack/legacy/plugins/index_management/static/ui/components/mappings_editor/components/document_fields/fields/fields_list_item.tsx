/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';

import { useState, useDispatch } from '../../../mappings_state';
import { FieldsList } from './fields_list';
import { CreateField } from './create_field';
import { DeleteFieldProvider } from './delete_field_provider';
import { NormalizedField } from '../../../types';

interface Props {
  field: NormalizedField;
  treeDepth?: number;
}

const inlineStyle = {
  padding: '20px 0',
  borderBottom: '1px solid #ddd',
  height: '82px',
  display: 'flex',
  alignItems: 'center',
};

export const FieldsListItem = ({ field, treeDepth = 0 }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldToAddFieldTo },
    fields: { byId },
  } = useState();
  const getField = (propId: string) => byId[propId];
  const { id, source, childFields, hasChildFields, canHaveChildFields } = field;

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
        {canHaveChildFields && <EuiButton onClick={addField}>Add field</EuiButton>}
        <DeleteFieldProvider>
          {deleteField => <EuiButton onClick={() => deleteField(field)}>Remove</EuiButton>}
        </DeleteFieldProvider>
      </>
    );
  };

  return (
    <>
      <div style={inlineStyle}>
        {source.name} | {source.type} {renderActionButtons()}
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
