/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConfigDrivenProcessorFormState, FieldConfiguration } from '../types';
import { ToggleField } from '../../toggle_field';
import { ExtractBooleanFields } from '../../../types';

export const BooleanField = ({
  fieldConfiguration,
}: {
  fieldConfiguration: FieldConfiguration;
}) => {
  const { field, label, helpText } = fieldConfiguration;
  return (
    <ToggleField
      name={field as ExtractBooleanFields<ConfigDrivenProcessorFormState>}
      label={label}
      helpText={helpText}
    />
  );
};
