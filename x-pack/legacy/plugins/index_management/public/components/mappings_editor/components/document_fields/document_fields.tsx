/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { useState, useDispatch } from '../../mappings_state';
import { FieldsList, CreateField, EditField } from './fields';

export const DocumentFields = () => {
  const dispatch = useDispatch();
  const {
    fields: { byId, rootLevelFields },
    documentFields: { status, fieldToAddFieldTo, fieldToEdit },
  } = useState();

  const getField = (fieldId: string) => byId[fieldId];
  const fields = rootLevelFields.map(getField);

  const addField = () => {
    dispatch({ type: 'documentField.createField' });
  };

  const renderCreateField = () => {
    // The "fieldToAddFieldTo" is undefined when adding to the top level "properties" object.
    if (status !== 'creatingField' || fieldToAddFieldTo !== undefined) {
      return null;
    }

    return (
      <div className="mappings-editor__create-field-wrapper">
        <div className="mappings-editor__create-field-content">
          <CreateField />
        </div>
      </div>
    );
  };

  const renderAddFieldButton = () => {
    const isDisabled = status !== 'idle';
    return (
      <>
        <EuiSpacer />
        <EuiButtonEmpty disabled={isDisabled} onClick={addField} iconType="plusInCircleFilled">
          Add field
        </EuiButtonEmpty>
      </>
    );
  };

  const renderEditField = () => {
    if (status !== 'editingField') {
      return null;
    }
    const field = byId[fieldToEdit!];
    return <EditField field={field} />;
  };

  return (
    <>
      <FieldsList fields={fields} />
      {renderCreateField()}
      {renderAddFieldButton()}
      {renderEditField()}
    </>
  );
};
