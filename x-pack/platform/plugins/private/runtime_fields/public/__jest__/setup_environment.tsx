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

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

  const isArrayLikeWithZero = (v: unknown): v is { 0: unknown } => isRecord(v) && '0' in v;

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
        onChange={(evt: unknown) => {
          if (isArrayLikeWithZero(evt)) {
            const first = evt[0];
            if (isRecord(first) && typeof first.label === 'string') {
              props.onChange([first as { label: string; value?: string }]);
            }
            return;
          }

          if (isRecord(evt) && isRecord(evt.target) && typeof evt.target.value === 'string') {
            const value = evt.target.value;
            props.onChange([{ label: value, value }]);
          }
        }}
      />
    ),
  };
});
