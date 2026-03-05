/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LogoProps } from '../types';

const Logo = (props: LogoProps) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    role="img"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <title>MongoDB</title>
    {/* Simplified leaf/database-style icon */}
    <path d="M12 2C9.5 2 7 4 7 7v10c0 2.5 2 4.5 5 5 3-.5 5-2.5 5-5V7c0-3-2.5-5-5-5zm0 2c1.5 0 3 1.2 3 3v10c0 1.8-1.5 3-3 3s-3-1.2-3-3V7c0-1.8 1.5-3 3-3z" />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export default Logo;
