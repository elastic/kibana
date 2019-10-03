/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';

import { useState, useDispatch } from '../../mappings_state';
import { DocumentFieldsHeaders } from './document_fields_header';
import { PropertiesList, CreateProperty } from './properties';

export const DocumentFields = () => {
  const dispatch = useDispatch();
  const {
    properties: { byId, rootLevelFields },
    documentFields: { status, fieldPathToAddProperty },
  } = useState();

  const getProperty = (propId: string) => byId[propId];
  const properties = rootLevelFields.map(getProperty);

  const addField = () => {
    dispatch({ type: 'documentField.createProperty' });
  };

  const renderCreateProperty = () => {
    // Root level (0) does not have the "fieldPathToAddProperty" set
    if (status !== 'creatingProperty' || fieldPathToAddProperty !== undefined) {
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
      <DocumentFieldsHeaders />
      <PropertiesList properties={properties} />
      {renderCreateProperty()}
      {renderAddFieldButton()}
    </>
  );
};
