/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { ConditionEditor } from '../../condition_editor';
import type { ProcessorFormState } from '../types';

export const ProcessorConditionEditor = () => {
  const { field } = useController<ProcessorFormState, 'where'>({ name: 'where' });

  if (field.value === undefined) {
    return null;
  }

  return (
    <ConditionEditor
      where={field.value}
      onConditionChange={(params) => field.onChange(params.where)}
    />
  );
};
