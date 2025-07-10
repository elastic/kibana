/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const AssistantLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="100%"
    width="100%"
    viewBox="0 0 64 64"
    fill="none"
    {...props}
  >
    <path fill="#F04E98" d="M36 28h24v36H36V28Z" />
    <path fill="#02BCB7" d="M4 46c0-9.941 8.059-18 18-18h6v36h-6c-9.941 0-18-8.059-18-18Z" />
    <path
      fill="#0B64DD"
      d="M60 12c0 6.627-5.373 12-12 12s-12-5.373-12-12S41.373 0 48 0s12 5.373 12 12Z"
    />
    <path fill="#FEC514" d="M6 23C6 10.85 15.85 1 28 1v22H6Z" />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { AssistantLogo as default };
