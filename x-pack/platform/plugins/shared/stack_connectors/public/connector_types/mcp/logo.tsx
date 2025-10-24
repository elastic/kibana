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
    height="32"
    width="32"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>MCP Connector</title>
    <defs>
      <linearGradient id="mcpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#F5A623', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#F2C94C', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <rect
      x="2"
      y="2"
      width="28"
      height="28"
      rx="6"
      fill="url(#mcpGradient)"
    />
    <g fill="#FFFFFF">
      {/* Connection icon - represents MCP protocol connectivity */}
      <path d="M16 8c-2.2 0-4 1.8-4 4 0 1.3.6 2.4 1.5 3.1L11 18.5c-.3.6-.1 1.3.5 1.6.6.3 1.3.1 1.6-.5L16 15c.3 0 .6 0 .9-.1l3.5 5.6c.3.6 1 .8 1.6.5.6-.3.8-1 .5-1.6l-2.5-4.3c.6-.7 1-1.7 1-2.8 0-2.2-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
      <circle cx="8" cy="24" r="2" />
      <circle cx="24" cy="24" r="2" />
    </g>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { Logo as default };
