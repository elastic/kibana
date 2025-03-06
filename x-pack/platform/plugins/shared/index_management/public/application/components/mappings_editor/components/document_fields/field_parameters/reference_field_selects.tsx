/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { getFieldConfig } from '../../../lib';
import { useMappingsState } from '../../../mappings_state_context';
import { SuperSelectField, UseField } from '../../../shared_imports';
import { SuperSelectOption } from '../../../types';

export const ReferenceFieldSelects = () => {
  const { fields, mappingViewFields } = useMappingsState();

  const allFields = {
    byId: {
      ...mappingViewFields.byId,
      ...fields.byId,
    },
    rootLevelFields: [],
    aliases: {},
    maxNestedDepth: 0,
  };

  const referenceFieldOptions: SuperSelectOption[] = Object.values(allFields.byId)
    .filter((field) => field.source.type === 'text' && !field.isMultiField)
    .map((field) => ({
      value: field.path.join('.'),
      inputDisplay: field.path.join('.'),
      'data-test-subj': `select-reference-field-${field.path.join('.')}}`,
    }));
  const fieldConfigReferenceField = getFieldConfig('reference_field');
  return (
    <UseField path="reference_field" config={fieldConfigReferenceField}>
      {(field) => (
        <SuperSelectField
          field={field}
          euiFieldProps={{
            options: referenceFieldOptions,
          }}
          data-test-subj="referenceFieldSelect"
        />
      )}
    </UseField>
  );
};
