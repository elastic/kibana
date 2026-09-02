/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { FieldConfig, ValidationFunc } from '../../../shared_imports';
import { TextField, UseField } from '../../../shared_imports';
import { validateUniqueName } from '../../../lib';
import { PARAMETERS_DEFINITION } from '../../../constants';
import { useMappingsState } from '../../../mappings_state_context';

const { validations: _validations, ...rest } = PARAMETERS_DEFINITION.name
  .fieldConfig as FieldConfig;

export const RenameFieldParameter: React.FC = () => {
  const {
    fields: { rootLevelFields, byId },
    documentFields: { fieldToAddFieldTo, fieldToEdit },
    mappingViewFields,
  } = useMappingsState();

  const initialName = fieldToEdit ? byId[fieldToEdit].source.name : undefined;
  const parentId = fieldToEdit ? byId[fieldToEdit].parentId : fieldToAddFieldTo;
  const isAddingNewField = !fieldToEdit;
  const uniqueNameValidator = useCallback<ValidationFunc>(
    (arg) => {
      return validateUniqueName(
        { rootLevelFields, byId },
        initialName,
        parentId,
        isAddingNewField ? mappingViewFields : undefined
      )(arg);
    },
    [rootLevelFields, byId, initialName, parentId, isAddingNewField, mappingViewFields]
  );

  const renameConfig: FieldConfig = useMemo(
    () => ({
      ...rest,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.renameFieldToLabel', {
        defaultMessage: 'Rename field to (optional)',
      }),
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.renameFieldToHelpText', {
        defaultMessage: 'How this field should be named in queries.',
      }),
      validations: [
        {
          validator: uniqueNameValidator,
        },
      ],
    }),
    [uniqueNameValidator]
  );

  return (
    <UseField
      path="name"
      config={renameConfig}
      component={TextField}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': 'renameFieldParameterInput',
        },
      }}
    />
  );
};
