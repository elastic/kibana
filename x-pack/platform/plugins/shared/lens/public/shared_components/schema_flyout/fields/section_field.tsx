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
import { EuiAccordion } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../types';
import { SchemaFormField } from './schema_form_field';

interface SectionFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}

export const SectionField = ({ descriptor, control }: SectionFieldProps) => {
  if (!descriptor.children?.length) return null;

  return (
    <EuiAccordion
      id={`section-${descriptor.path}`}
      buttonContent={descriptor.label}
      initialIsOpen
      data-test-subj={`schemaSection-${descriptor.path}`}
    >
      {descriptor.children.map((child) => (
        <SchemaFormField key={child.path} descriptor={child} control={control} />
      ))}
    </EuiAccordion>
  );
};
