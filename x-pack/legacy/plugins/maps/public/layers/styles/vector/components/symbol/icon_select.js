/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiComboBox } from '@elastic/eui';
import { SymbolIcon } from '../legend/symbol_icon';

export function IconSelect({ isDarkMode, onChange, symbolOptions, value }) {
  const selectedOption = symbolOptions.find(symbolOption => {
    return symbolOption.value === value;
  });

  const onSymbolChange = selectedOptions => {
    if (!selectedOptions || selectedOptions.length === 0) {
      // do not allow select to be cleared
      return;
    }

    onChange(selectedOptions[0].value);
  };

  const renderOption = symbolOption => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false} style={{ width: '15px' }}>
          <SymbolIcon
            symbolId={symbolOption.value}
            fill={isDarkMode ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
            stroke={isDarkMode ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'}
            strokeWidth={'1px'}
          />
        </EuiFlexItem>
        <EuiFlexItem>{symbolOption.label}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiComboBox
      options={symbolOptions}
      onChange={onSymbolChange}
      selectedOptions={selectedOption ? [selectedOption] : undefined}
      singleSelection={true}
      isClearable={false}
      renderOption={renderOption}
      compressed
    />
  );
}
