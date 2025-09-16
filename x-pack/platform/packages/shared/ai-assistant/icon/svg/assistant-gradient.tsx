/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface AssistantLogoGradientProps extends React.SVGProps<SVGSVGElement> {}

const AssistantLogoGradient = ({ ...props }: AssistantLogoGradientProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="100%"
    width="100%"
    viewBox="0 0 100 100"
    fill="none"
    {...props}
  >
    <defs>
      <linearGradient id="assistantGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="12%" stopColor="#48EFCF" />
        <stop offset="68%" stopColor="#0B64DD" />
      </linearGradient>
      <mask id="assistantMask">
        <rect width="100" height="100" fill="black" />
        <g transform="translate(2, 2) scale(1.56)">
          <path fill="white" d="M36 28h24v36H36V28Z" />
          <path fill="white" d="M4 46c0-9.941 8.059-18 18-18h6v36h-6c-9.941 0-18-8.059-18-18Z" />
          <path
            fill="white"
            d="M60 12c0 6.627-5.373 12-12 12s-12-5.373-12-12S41.373 0 48 0s12 5.373 12 12Z"
          />
          <path fill="white" d="M6 23C6 10.85 15.85 1 28 1v22H6Z" />
        </g>
      </mask>
    </defs>
    <rect width="140" height="140" fill="url(#assistantGradient)" mask="url(#assistantMask)" />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { AssistantLogoGradient as default };
