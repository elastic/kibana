/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { useMappingsState, useDispatch } from '../../mappings_state';
import { FieldsList, CreateField, EditField } from './fields';

export const DocumentFields = () => {
  const dispatch = useDispatch();
  const {
    fields: { byId, rootLevelFields },
    documentFields: { status, fieldToAddFieldTo, fieldToEdit },
  } = useMappingsState();

  const getField = (fieldId: string) => byId[fieldId];
  const fields = useMemo(() => rootLevelFields.map(getField), [rootLevelFields]);

  const addField = () => {
    dispatch({ type: 'documentField.createField' });
  };

  useEffect(() => {
    if (status === 'idle' && fields.length === 0) {
      addField();
    }
  }, [fields, status]);

  const renderCreateField = () => {
    // The "fieldToAddFieldTo" is undefined when adding to the top level "properties" object.
    const showCreateField = status === 'creatingField' && fieldToAddFieldTo === undefined;

    if (!showCreateField) {
      return null;
    }

    return <CreateField isCancelable={fields.length > 0} />;
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
    return <EditField field={field} allFields={byId} />;
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
