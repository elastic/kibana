/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

interface Props {
  name: string;
  value: number;
  details: { [key: string]: unknown };
  errors: string[];
  setRuleParams: (property: string, value: number) => void;
}
export const AlertParamNumber: React.FC<Props> = (props: Props) => {
  const { name, details, setRuleParams, errors } = props;
  const [value, setValue] = useState(props.value);
  return (
    <EuiFormRow label={details.label as string} error={errors} isInvalid={errors?.length > 0}>
      <EuiFieldNumber
        compressed
        value={value}
        append={details.append as string}
        onChange={(e) => {
          let newValue = Number(e.target.value);
          if (isNaN(newValue)) {
            newValue = 0;
          }
          setValue(newValue);
          setRuleParams(name, newValue);
        }}
      />
    </EuiFormRow>
  );
};
