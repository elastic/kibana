/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { isInterpreterError, isInterpreterResult } from 'src/plugins/expressions/public';
import { useExpressions } from '../hooks';
import { InterpreterResult } from './expressions';

export const Output: FC = () => {
  const { debug } = useExpressions();
  let render = <div>Waiting for valid result...</div>;
  if (debug) {
    if (isInterpreterError(debug)) {
      render = <code>BOOM: {debug.error.message}</code>;
    } else if (isInterpreterResult(debug)) {
      render = <InterpreterResult result={debug} />;
    }
  }
  return render;
};
