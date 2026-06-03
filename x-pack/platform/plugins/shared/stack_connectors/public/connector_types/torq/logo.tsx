/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LogoProps } from '../types';

const Logo = (props: LogoProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#00A6C1" {...props}>
      <path d="M88.5,20.3c0-3.5-3.8-6.7-7.8-6.7H46V30h42.5L88.5,20.3z" fill="#00A6C1" />
      <rect x="11.5" y="41.8" width="77" height="16.4" fill="#00A6C1" />
      <path d="M11.6,70v9.4c0,3.6,3.8,6.9,7.8,6.9h35.4V70L11.6,70L11.6,70z" fill="#00A6C1" />
    </svg>
  );
};

// eslint-disable-next-line import/no-default-export
export { Logo as default };
