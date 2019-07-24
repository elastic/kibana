/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import {
  EuiToolTip
} from '@elastic/eui';


const MAX_CHARS = 12;

export function DisplayValue({ value }) {
  const length = String(value).length;
  let formattedValue;

  if (length <= MAX_CHARS) {
    formattedValue = value;
  } else {
    formattedValue = (
      <EuiToolTip content={value} anchorClassName="valueWrapper">
        <span>
          {value}
        </span>
      </EuiToolTip>
    );
  }

  return formattedValue;
}
