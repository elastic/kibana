/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import type { ProcessorFormState } from '../../../types';
import { ProcessorConditionEditorWrapper } from '../../../processor_condition_editor';

import { undefinedToAlways } from '../../../../../../util/condition';

export const ProcessorConditionEditor = () => {
  const { field } = useController<ProcessorFormState, 'where'>({
    name: 'where',
  });

  return (
    <ProcessorConditionEditorWrapper
      condition={undefinedToAlways(field.value)}
      onConditionChange={field.onChange}
    />
  );
};
