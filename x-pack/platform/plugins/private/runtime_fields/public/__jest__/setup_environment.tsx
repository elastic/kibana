/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@kbn/code-editor-mock/jest_helper';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    EuiComboBox: (props: {
      onChange: (options: Array<{ label: string; value?: string }>) => void;
      selectedOptions: Array<{ value?: string }>;
      'data-test-subj'?: string;
    }) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockComboBox'}
        data-currentvalue={props.selectedOptions}
        value={props.selectedOptions[0]?.value}
        // The real `EuiComboBox` calls `onChange` with an array of selected options.
        // Our RTL unit tests drive this mock via `fireEvent.change(input, { target: { value } })`,
        // so we translate the input value into the EuiComboBox-style payload.
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const value = event.target.value;
          props.onChange([{ label: value, value }]);
        }}
      />
    ),
  };
});
