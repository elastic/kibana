/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import React from 'react';
import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../types';
import { ToggleField } from './toggle_field';
import { SelectField } from './select_field';
import { NumberField } from './number_field';
import { TextField } from './text_field';
import { SectionField } from './section_field';

interface SchemaFormFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

export const SchemaFormField = ({ descriptor, control }: SchemaFormFieldProps) => {
  switch (descriptor.type) {
    case 'toggle':
      return <ToggleField descriptor={descriptor} control={control} />;
    case 'select':
      return <SelectField descriptor={descriptor} control={control} />;
    case 'number':
      return <NumberField descriptor={descriptor} control={control} />;
    case 'text':
      return <TextField descriptor={descriptor} control={control} />;
    case 'section':
      return <SectionField descriptor={descriptor} control={control} />;
    default:
      return null;
  }
};
