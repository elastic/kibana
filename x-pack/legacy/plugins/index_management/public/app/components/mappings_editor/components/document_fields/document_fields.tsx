/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMappingsState, useDispatch } from '../../mappings_state';
import { FieldsList, CreateField, EditFieldContainer } from './fields';

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
    /**
     * If there aren't any fields yet, we display the create field form
     */
    if (status === 'idle' && fields.length === 0) {
      addField();
    }
  }, [fields, status]);

  const renderCreateField = () => {
    // The "fieldToAddFieldTo" is undefined when adding to the top level "properties" object.
    const isCreateFieldFormVisible = status === 'creatingField' && fieldToAddFieldTo === undefined;

    if (!isCreateFieldFormVisible) {
      return null;
    }

    return <CreateField isCancelable={fields.length > 0} allFields={byId} />;
  };

  const renderAddFieldButton = () => {
    const isDisabled = status !== 'idle';
    return (
      <>
        <EuiSpacer />
        <EuiButtonEmpty
          disabled={isDisabled}
          onClick={addField}
          iconType="plusInCircleFilled"
          data-test-subj="addFieldButton"
        >
          {i18n.translate('xpack.idxMgmt.mappingsEditor.addFieldButtonLabel', {
            defaultMessage: 'Add field',
          })}
        </EuiButtonEmpty>
      </>
    );
  };

  const renderEditField = () => {
    if (status !== 'editingField') {
      return null;
    }
    const field = byId[fieldToEdit!];
    return <EditFieldContainer field={field} allFields={byId} />;
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
