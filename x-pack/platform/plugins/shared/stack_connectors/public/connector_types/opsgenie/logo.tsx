/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogoProps } from '../types';

const Logo = (props: LogoProps) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 305 305"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M152.496 152.116C194.502 152.116 228.554 118.064 228.554 76.0579C228.554 34.0523 194.502 0 152.496 0C110.491 0 76.4382 34.0523 76.4382 76.0579C76.4382 118.064 110.491 152.116 152.496 152.116Z"
      fill="url(#paint0_linear_3056_223288)"
    />
    <path
      d="M146.016 302.953C96.3433 271.266 55.0322 228.083 25.5766 177.056C24.438 175.011 24.1904 172.587 24.8918 170.354C25.5933 168.121 27.1821 166.274 29.2857 165.247L86.8833 136.981C90.9123 135.016 95.7746 136.507 98.0106 140.392C127.131 189.198 170.19 228.174 221.647 252.304C202.67 271.425 181.654 288.41 158.976 302.953C155.011 305.429 149.981 305.429 146.016 302.953Z"
      fill="url(#paint1_linear_3056_223288)"
    />
    <path
      d="M158.976 302.953C208.655 271.274 249.968 228.089 279.416 177.056C280.557 175.016 280.811 172.597 280.118 170.364C279.425 168.132 277.845 166.282 275.749 165.247L218.109 136.981C214.08 135.016 209.217 136.507 206.981 140.392C177.867 189.203 134.806 228.181 83.3447 252.304C102.311 271.438 123.328 288.424 146.016 302.953C149.981 305.429 155.011 305.429 158.976 302.953Z"
      fill="#2684FF"
    />
    <defs>
      <linearGradient
        id="paint0_linear_3056_223288"
        x1="152.496"
        y1="25.2816"
        x2="152.496"
        y2="181.448"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2684FF" />
        <stop offset="0.82" stopColor="#0052CC" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_3056_223288"
        x1="105.685"
        y1="188.682"
        x2="146.589"
        y2="274.292"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2684FF" />
        <stop offset="0.62" stopColor="#0052CC" />
      </linearGradient>
    </defs>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { Logo as default };
