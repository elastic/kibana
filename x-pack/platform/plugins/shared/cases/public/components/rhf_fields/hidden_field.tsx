/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';

interface HiddenFieldProps {
  name: string;
  'data-test-subj'?: string;
}

/** Keeps a value in the form state (and in the submitted data) without rendering anything visible. */
export const HiddenField = ({ name, 'data-test-subj': dataTestSubj }: HiddenFieldProps) => {
  const { field } = useController<Record<string, string | undefined>>({ name });

  return (
    <input
      type="hidden"
      name={field.name}
      value={field.value ?? ''}
      data-test-subj={dataTestSubj}
      readOnly
    />
  );
};
HiddenField.displayName = 'HiddenField';
