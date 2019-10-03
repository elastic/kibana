/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';

import { useState, useDispatch } from '../../../mappings_state';
import { PropertiesList } from './properties_list';
import { CreateProperty } from './create_property';
import { NormalizedProperty } from '../../../types';

interface Props {
  property: NormalizedProperty;
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

export const PropertiesListItem = ({ property, parentPath, treeDepth = 0 }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldPathToAddProperty },
    properties: { byId },
  } = useState();
  const getProperty = (propId: string) => byId[propId];
  const { path, resource, childProperties, hasChildProperties, canHaveChildProperties } = property;

  const addField = () => {
    dispatch({
      type: 'documentField.createProperty',
      value: path,
    });
  };

  const editField = () => {
    // console.log('Editing', propertyPath);
  };

  const removeField = () => {
    // console.log('Removing', propertyPath);
  };

  const renderCreateProperty = () => {
    if (status !== 'creatingProperty') {
      return null;
    }

    // Root level (0) has does not have the "fieldPathToAddProperty" set
    if (fieldPathToAddProperty !== path) {
      return null;
    }

    return (
      <div style={{ paddingLeft: '20px' }}>
        <CreateProperty />
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
        {canHaveChildProperties && <EuiButton onClick={addField}>Add field</EuiButton>}
        <EuiButton onClick={removeField}>Remove</EuiButton>
      </>
    );
  };

  return (
    <>
      <div style={inlineStyle}>
        {resource.name} | {resource.type} {renderActionButtons()}
      </div>

      {renderCreateProperty()}

      {hasChildProperties && (
        <div style={{ paddingLeft: '20px' }}>
          <PropertiesList
            properties={childProperties!.map(getProperty)}
            treeDepth={treeDepth + 1}
            path={path}
          />
        </div>
      )}
    </>
  );
};
