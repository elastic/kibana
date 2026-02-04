/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';

import type { ExpressionInputProps } from './types';
import { ExpressionInputInternal } from './expression_input_internal';

interface Props extends Omit<ExpressionInputProps, 'height'> {
  /** Optional string for displaying error messages */
  error?: string;
}

export const ExpressionInput = ({ error, ...rest }: Props) => {
  return (
    <div className="canvasExpressionInput" data-test-subj="canvasExpressionInput">
      <EuiFormRow
        className="canvasExpressionInput__inner"
        fullWidth
        isInvalid={Boolean(error)}
        error={error}
      >
        <div className="canvasExpressionInput__editor">
          <ExpressionInputInternal height="100%" {...rest} />
        </div>
      </EuiFormRow>
    </div>
  );
};
