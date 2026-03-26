/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LogoProps } from '../types';

const JsmLogo = (props: LogoProps) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Atlassian Jira Service Management Logo</title>
    <g clipPath="url(#clip0_1_9)">
      <path
        d="M0 12C0 5.37258 5.37258 0 12 0H36C42.6274 0 48 5.37258 48 12V36C48 42.6274 42.6274 48 36 48H12C5.37258 48 0 42.6274 0 36V12Z"
        fill="#FFC716"
      />
      <mask
        id="mask0_1_9"
        style={{ maskType: 'luminance' }}
        maskUnits="userSpaceOnUse"
        x="10"
        y="7"
        width="28"
        height="33"
      >
        <path d="M37.7159 7.75049H10.1876V39.9255H37.7159V7.75049Z" fill="white" />
      </mask>
      <g mask="url(#mask0_1_9)">
        <path
          d="M27.4016 20.4052H36.3282C37.6688 20.4052 38.1266 21.6804 37.3091 22.694L23.347 39.926C18.8347 36.3292 19.2597 30.6397 22.5623 26.487L27.4016 20.4052ZM20.5023 27.2718H11.5757C10.2351 27.2718 9.77728 25.9966 10.5947 24.9829L24.5569 7.75098C29.0692 11.3478 28.5787 16.9719 25.3089 21.1572L20.5023 27.2718Z"
          fill="#101214"
        />
      </g>
    </g>
    <defs>
      <clipPath id="clip0_1_9">
        <rect width="48" height="48" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { JsmLogo as default };
