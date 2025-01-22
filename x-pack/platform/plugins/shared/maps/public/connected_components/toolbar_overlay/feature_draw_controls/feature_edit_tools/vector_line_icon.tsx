/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

export const VectorLineIcon: FunctionComponent = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="none"
    viewBox="0 0 16 16"
    {...props}
  >
    <path d="M11.506 3.881l.707.707-7.594 7.594-.707-.707z" />
    <path
      fillRule="evenodd"
      d="M5 11H1v4h4v-4zm-1 1H2v2h2v-2zM15 1h-4v4h4V1zm-1 1h-2v2h2V2z"
      clipRule="evenodd"
    />
  </svg>
);
