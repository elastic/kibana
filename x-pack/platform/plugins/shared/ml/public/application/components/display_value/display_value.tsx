/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiToolTip } from '@elastic/eui';

const MAX_CHARS = 12;

export const DisplayValue: FC<{ value: any }> = ({ value }) => {
  const length = String(value).length;

  if (length <= MAX_CHARS) {
    return <b>{value}</b>;
  } else {
    return (
      <EuiToolTip content={value} anchorClassName="valueWrapper">
        <b>{value}</b>
      </EuiToolTip>
    );
  }
};
