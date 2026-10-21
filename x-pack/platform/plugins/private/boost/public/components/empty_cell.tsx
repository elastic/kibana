/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor, useEuiTheme } from '@elastic/eui';

/** A table cell's empty or unknown value: a dash, disabled so it recedes beside the values. */
export const EmptyCell = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiTextColor color={euiTheme.colors.textDisabled} data-test-subj="boostEmptyCell">
      —
    </EuiTextColor>
  );
};
