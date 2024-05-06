/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogoProps } from '../types';

const Logo = (props: LogoProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      fill="none"
      stroke="null"
      vectorEffect="non-scaling-stroke"
      {...props}
    >
      <g fillRule="evenodd" stroke="null" clipRule="evenodd">
        <path
          fill="#19CCC0"
          d="M21.536 9.338a1.053 1.053 0 00-1.29 0l-4.564 3.566a.988.988 0 000 1.566l4.725 3.691c.02.016.05.016.07 0l6.12-4.782a.054.054 0 000-.086l-5.061-3.955z"
          vectorEffect="non-scaling-stroke"
        />
        <path
          fill="#00FFF4"
          d="M15.684 31.61l10.728-8.382a.627.627 0 00.244-.494v-9.401l-11.787 9.21a.627.627 0 00-.244.494v8.08c0 .531.633.827 1.059.494z"
          vectorEffect="non-scaling-stroke"
        />
        <path
          fill="#27AFA2"
          d="M26.655 13.331L20.44 18.19l-1.703-1.331 7.917-3.527z"
          vectorEffect="non-scaling-stroke"
        />
        <path
          fill="#028ACF"
          d="M10.464 22.663c.377.294.914.294 1.291 0l4.563-3.566a.987.987 0 000-1.565l-4.724-3.692a.058.058 0 00-.071 0l-6.12 4.782a.054.054 0 000 .086l5.061 3.955z"
          vectorEffect="non-scaling-stroke"
        />
        <path
          fill="#02AAFF"
          d="M16.316.39L5.588 8.771a.628.628 0 00-.244.494v9.401l11.787-9.21a.628.628 0 00.244-.494V.883c0-.531-.633-.827-1.059-.494z"
          vectorEffect="non-scaling-stroke"
        />
        <path fill="#0578A5" d="M5.344 18.67l6.214-4.858 1.704 1.331-7.918 3.527z" />
      </g>
    </svg>
  );
};

// eslint-disable-next-line import/no-default-export
export { Logo as default };
