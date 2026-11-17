/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PackagePolicyConditionField } from '@kbn/fleet-plugin/public';

export interface ConditionFieldProps {
  value: string;
  onChange: (condition: string) => void;
  errors?: string[];
}

/**
 * The agent condition every policy of the onboarding gets, as Fleet's Add integration offers it.
 * Its errors show at once: the field is empty until edited, and the advanced options open over it.
 */
export function ConditionField({ value, onChange, errors }: ConditionFieldProps) {
  return (
    <PackagePolicyConditionField
      compressed
      helpTextAsTooltip
      value={value}
      onChange={(condition) => onChange(condition ?? '')}
      isInvalid={!!errors?.length}
      errors={errors ?? null}
      dataTestSubj="sharedSettingsCondition"
    />
  );
}
