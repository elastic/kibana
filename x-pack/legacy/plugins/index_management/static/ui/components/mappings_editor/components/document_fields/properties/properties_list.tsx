/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';

import { useState, useDispatch } from '../../../mappings_state';
import { PropertiesListItem } from './properties_list_item';
import { CreateProperty } from './create_property';
import { Property } from '../../../types';

interface Props {
  properties?: Property[];
  path?: string;
  treeDepth?: number;
}

export const PropertiesList = React.memo(({ properties = [], treeDepth = 0, path = '' }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldPathToAddProperty },
  } = useState();

  const addField = () => {
    dispatch({ type: 'documentField.createProperty' });
  };

  const renderCreateProperty = () => {
    if (status !== 'creatingProperty') {
      return null;
    }

    // Root level (0) has does not have the "fieldPathToAddProperty" set
    if (treeDepth === 0 && fieldPathToAddProperty !== undefined) {
      return null;
    }

    return <CreateProperty />;
  };

  const renderAddFieldButton = () => {
    if (status === 'creatingProperty') {
      return null;
    }
    return (
      <>
        <EuiSpacer />
        <EuiButton onClick={addField}>Add field</EuiButton>
      </>
    );
  };

  return (
    <>
      <div>
        <ul>
          {properties.map(property => (
            <li key={path ? `${path}.${property.name}` : property.name}>
              <PropertiesListItem property={property} treeDepth={treeDepth} parentPath={path} />
            </li>
          ))}
        </ul>
      </div>
      {treeDepth === 0 && (
        <>
          {renderCreateProperty()}
          {renderAddFieldButton()}
        </>
      )}
    </>
  );
});
