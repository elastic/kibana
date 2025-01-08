/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { TextField, UseField, FieldConfig } from '../../../shared_imports';
import { validateUniqueName } from '../../../lib';
import { PARAMETERS_DEFINITION } from '../../../constants';
import { useMappingsState } from '../../../mappings_state_context';

const { validations, ...rest } = PARAMETERS_DEFINITION.name.fieldConfig as FieldConfig;

interface NameParameterProps {
  isSemanticText?: boolean;
}

export const NameParameter: React.FC<NameParameterProps> = ({ isSemanticText }) => {
  const {
    fields: { rootLevelFields, byId },
    documentFields: { fieldToAddFieldTo, fieldToEdit },
  } = useMappingsState();

  const initialName = fieldToEdit ? byId[fieldToEdit].source.name : undefined;
  const parentId = fieldToEdit ? byId[fieldToEdit].parentId : fieldToAddFieldTo;
  const uniqueNameValidator = useCallback(
    (arg: any) => {
      return validateUniqueName({ rootLevelFields, byId }, initialName, parentId)(arg);
    },
    [rootLevelFields, byId, initialName, parentId]
  );

  const nameConfig: FieldConfig = useMemo(
    () => ({
      ...rest,
      label: isSemanticText
        ? i18n.translate('xpack.idxMgmt.mappingsEditor.semanticTextNameFieldLabel', {
            defaultMessage: 'New field name',
          })
        : rest.label,
      validations: [
        ...validations!,
        {
          validator: uniqueNameValidator,
        },
      ],
    }),
    [isSemanticText, uniqueNameValidator]
  );

  return (
    <UseField
      path="name"
      config={nameConfig}
      component={TextField}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': 'nameParameterInput',
        },
      }}
    />
  );
};
