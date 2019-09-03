/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';

export function Ellipsis({ horizontal }: { horizontal: boolean }) {
  return (
    <EuiIcon
      style={{
        transition: 'transform 0.1s',
        transform: `rotate(${horizontal ? 90 : 0}deg)`
      }}
      type="arrowRight"
    />
  );
}
