/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const Logo: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Workday"
  >
    <circle cx="16" cy="16" r="16" fill="#F38B00" />
    <path
      d="M6 10.5h3.6l1.9 8.3h.05l2.05-8.3h3.1l2.05 8.3h.05l1.9-8.3H24l-3.5 11h-3.3l-2.15-8.55h-.05L12.85 21.5H9.5z"
      fill="#ffffff"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default Logo;
