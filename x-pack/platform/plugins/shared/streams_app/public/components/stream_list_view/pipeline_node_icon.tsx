/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export function PipelineNodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 11.5H14.5C14.2245 11.5 14 11.276 14 11V7C14 6.724 14.2245 6.5 14.5 6.5H15V11.5ZM10 10V11C10 11.276 9.7755 11.5 9.5 11.5H6.5C6.2245 11.5 6 11.276 6 11V10H3V8H6V7C6 6.724 6.2245 6.5 6.5 6.5H9.5C9.7755 6.5 10 6.724 10 7V8H13V10H10ZM1.5 11.5H1V6.5H1.5C1.7755 6.5 2 6.724 2 7V11C2 11.276 1.7755 11.5 1.5 11.5V11.5ZM14.5 5.5C13.673 5.5 13 6.173 13 7H11C11 6.173 10.327 5.5 9.5 5.5H6.5C5.673 5.5 5 6.173 5 7H3C3 6.173 2.327 5.5 1.5 5.5H0V12.5H1.5C2.327 12.5 3 11.827 3 11H5C5 11.827 5.673 12.5 6.5 12.5H9.5C10.327 12.5 11 11.827 11 11H13C13 11.827 13.673 12.5 14.5 12.5H16V5.5H14.5Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2.5H5V3.5H7.5V4.5H8.5V3.5H11V2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
