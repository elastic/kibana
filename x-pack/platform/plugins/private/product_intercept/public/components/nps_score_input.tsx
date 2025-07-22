/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonGroupProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';

interface NPSScoreInputProps {
  /**
   * default value here is 5
   */
  upperBound?: number;
  lowerBoundHelpText?: string;
  upperBoundHelpText?: string;
  onChange?: EuiButtonGroupProps['onChange'];
}

export function NPSScoreInput({
  onChange,
  lowerBoundHelpText,
  upperBoundHelpText,
  upperBound = 5,
}: NPSScoreInputProps) {
  const options: EuiButtonGroupProps['options'] = Array.from({ length: upperBound }, (_, i) => {
    const optionValue = i + 1;

    return {
      id: `nps-${optionValue}`,
      label: optionValue,
      value: optionValue,
    };
  });

  const [selectedOption, setSelectedOption] = useState('');

  return (
    <EuiFormRow
      helpText={
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <span>{lowerBoundHelpText}</span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span>{upperBoundHelpText}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiButtonGroup
        legend="Survey about user satisfaction"
        type="single"
        options={options}
        idSelected={selectedOption}
        onChange={(id, value) => {
          setSelectedOption(id);
          onChange?.(value);
        }}
        isFullWidth
      />
    </EuiFormRow>
  );
}
