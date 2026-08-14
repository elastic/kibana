/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext, useWatch } from 'react-hook-form';
import { isSequenceValid } from '@kbn/alerting-v2-rule-form';
import type { FormValues, SequenceFormValues } from '@kbn/alerting-v2-rule-form';
import { DEFAULT_SEQUENCE_RULE_NAME } from './use_sequence_builder_form';

export const useCanSaveSequenceRule = (
  seqValues: SequenceFormValues,
  isSaving: boolean
): boolean => {
  const {
    formState: { errors },
  } = useFormContext<FormValues>();
  const ruleName = useWatch<FormValues, 'metadata.name'>({ name: 'metadata.name' });
  const trimmedName = ruleName?.trim() ?? '';
  return (
    isSequenceValid(seqValues) &&
    trimmedName.length > 0 &&
    trimmedName !== DEFAULT_SEQUENCE_RULE_NAME &&
    Object.keys(errors).length === 0 &&
    !isSaving
  );
};
