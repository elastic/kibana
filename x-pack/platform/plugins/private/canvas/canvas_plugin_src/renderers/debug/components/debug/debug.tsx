/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import './debug.scss';

const LimitRows = (key: string, value: any) => {
  if (key === 'rows') {
    return value.slice(0, 99);
  }
  return value;
};

export const Debug = ({ payload }: { payload: unknown }) => (
  <EuiCode className="canvasDebug">
    <pre className="canvasDebug__content" data-test-subj="canvasDebug__content">
      {JSON.stringify(payload, LimitRows, 2)}
    </pre>
  </EuiCode>
);
