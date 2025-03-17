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

interface SecondStepProps {
  /**
   * default value here is 5
   */
  upperBound?: number;
  lowerBoundHelpText?: string;
  upperBoundHelpText?: string;
  onSelectionChange?: EuiButtonGroupProps['onChange'];
}

export function NPSScoreInput({
  onSelectionChange,
  lowerBoundHelpText,
  upperBoundHelpText,
  upperBound = 5,
}: SecondStepProps) {
  const options: EuiButtonGroupProps['options'] = Array.from({ length: upperBound }, (_, i) => ({
    id: `${i + 1}`,
    label: `${i + 1}`,
  }));

  const [selectedOption, setSelectedOption] = useState(options[0].id);

  return (
    <EuiFormRow
      css={() => ({})}
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
        onChange={(id) => {
          setSelectedOption(id);
          onSelectionChange?.(id);
        }}
        isFullWidth
      />
    </EuiFormRow>
  );
}
