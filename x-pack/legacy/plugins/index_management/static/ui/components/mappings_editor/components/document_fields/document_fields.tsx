/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';

import { useState, useDispatch } from '../../mappings_state';
import { validateUniqueName } from '../../lib';
import { DocumentFieldsHeaders } from './document_fields_header';
import { FieldsList, CreateField, EditField } from './fields';

export const DocumentFields = () => {
  const dispatch = useDispatch();
  const {
    fields: { byId, rootLevelFields },
    documentFields: { status, fieldToAddFieldTo, fieldToEdit },
  } = useState();

  const getField = (fieldId: string) => byId[fieldId];
  const fields = rootLevelFields.map(getField);

  const uniqueNameValidatorCreate = useMemo(() => {
    return validateUniqueName({ rootLevelFields, byId });
  }, [byId, rootLevelFields]);

  const uniqueNameValidatorEdit = useMemo(() => {
    if (fieldToEdit === undefined) {
      return;
    }
    return validateUniqueName({ rootLevelFields, byId }, byId[fieldToEdit!].source.name);
  }, [byId, rootLevelFields, fieldToEdit]);

  const addField = () => {
    dispatch({ type: 'documentField.createField' });
  };

  const renderCreateField = () => {
    // The "fieldToAddFieldTo" is undefined when adding to the top level "properties" object.
    if (status !== 'creatingField' || fieldToAddFieldTo !== undefined) {
      return null;
    }
    return <CreateField uniqueNameValidator={uniqueNameValidatorCreate} />;
  };

  const renderAddFieldButton = () => {
    if (status !== 'idle') {
      return null;
    }
    return (
      <>
        <EuiSpacer />
        <EuiButton onClick={addField}>Add field</EuiButton>
      </>
    );
  };

  const renderEditField = () => {
    if (status !== 'editingField') {
      return null;
    }
    const field = byId[fieldToEdit!];
    return <EditField field={field} uniqueNameValidator={uniqueNameValidatorEdit!} />;
  };

  return (
    <>
      <DocumentFieldsHeaders />
      <FieldsList fields={fields} />
      {renderCreateField()}
      {renderAddFieldButton()}
      {renderEditField()}
    </>
  );
};
