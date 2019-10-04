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
import { NormalizedField } from '../../../types';

interface Props {
  field: NormalizedField;
  parentPath: string;
  treeDepth?: number;
}

const inlineStyle = {
  padding: '20px 0',
  borderBottom: '1px solid #ddd',
  height: '82px',
  display: 'flex',
  alignItems: 'center',
};

export const FieldsListItem = ({ field, parentPath, treeDepth = 0 }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldPathToAddField },
    fields: { byId },
  } = useState();
  const getField = (propId: string) => byId[propId];
  const { path, source, childFields, hasChildFields, canHaveChildFields } = field;

  const addField = () => {
    dispatch({
      type: 'documentField.createField',
      value: path,
    });
  };

  const editField = () => {
    dispatch({
      type: 'documentField.editField',
      value: path,
    });
  };

  const removeField = () => {
    dispatch({
      type: 'field.remove',
      value: path,
    });
  };

  const renderCreateField = () => {
    if (status !== 'creatingField') {
      return null;
    }

    // Root level (0) has does not have the "fieldPathToAddField" set
    if (fieldPathToAddField !== path) {
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
        <EuiButton onClick={removeField}>Remove</EuiButton>
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
          <FieldsList fields={childFields!.map(getField)} treeDepth={treeDepth + 1} path={path} />
        </div>
      )}
    </>
  );
};
