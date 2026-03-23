/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// NOTE: Import this file for its side-effects. You must import it before the code that it mocks
// is imported. Typically this means just importing above your other imports.
// See https://jestjs.io/docs/manual-mocks for more info.

window.scrollTo = jest.fn();

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => {
      const selectedValue = props.selectedOptions?.[0]?.label || '';

      return (
        <input
          data-test-subj={props['data-test-subj'] || 'mockComboBox'}
          data-currentvalue={selectedValue}
          value={selectedValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            if (newValue === '') {
              // Empty value - call onChange with empty array
              props.onChange([]);
            } else {
              // Non-empty value - call onChange with option object
              props.onChange([{ label: newValue }]);
            }
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && props.onCreateOption) {
              const inputValue = (e.target as HTMLInputElement).value;
              if (inputValue) {
                props.onCreateOption(inputValue);
              }
            }
          }}
        />
      );
    },
    EuiIcon: 'eui-icon', // using custom react-svg icon causes issues, mocking for now.
  };
});
