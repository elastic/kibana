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
import { Property } from '../../../types';
import { getPropertyMeta } from '../../../lib';

interface Props {
  property: Property;
  parentPath: string;
  treeDepth?: number;
}

export const PropertiesListItem = ({ property, parentPath, treeDepth = 0 }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldPathToAddProperty },
  } = useState();
  const propertyPath = parentPath ? `${parentPath}.${property.name}` : property.name;
  const { canHaveChildProperties, childProperties, hasChildProperties } = getPropertyMeta(property);

  const addField = () => {
    dispatch({
      type: 'documentField.createProperty',
      value: propertyPath,
    });
  };

  const editField = () => {
    // console.log('Editing', propertyPath);
  };

  const removeField = () => {
    // console.log('Removing', propertyPath);
  };

  // console.log('............................Rendering', propertyPath);

  const renderCreateProperty = () => {
    if (status !== 'creatingProperty') {
      return null;
    }

    // Root level (0) has does not have the "fieldPathToAddProperty" set
    if (fieldPathToAddProperty !== propertyPath) {
      return null;
    }

    return <CreateProperty />;
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
    <div>
      <div style={{ padding: '20px 0', borderBottom: '1px solid #ddd' }}>
        {property.name} | {property.type} {renderActionButtons()}
      </div>

      {renderCreateProperty()}

      {hasChildProperties && (
        <div style={{ paddingLeft: '20px' }}>
          <PropertiesList
            properties={childProperties}
            treeDepth={treeDepth + 1}
            path={propertyPath}
          />
        </div>
      )}
    </div>
  );
};
