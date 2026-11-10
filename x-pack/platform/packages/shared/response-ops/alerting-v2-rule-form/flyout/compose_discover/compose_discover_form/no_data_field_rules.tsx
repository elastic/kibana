/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useController, useFormContext } from 'react-hook-form';
import type { FormValues } from '../../../form/types';
import { validateNoDataStrategy } from '../validation/no_data_validation';

/**
 * Always-mounted registration for the `noData` field: the rule reads `query` and
 * `kind` too, and has to hold on submit, when OutcomeStep is no longer rendered.
 */
export const NoDataFieldRules = (): null => {
  const { control } = useFormContext<FormValues>();

  useController({
    name: 'noData',
    control,
    rules: {
      validate: (noData, values) => validateNoDataStrategy({ ...values, noData }),
    },
  });

  return null;
};
