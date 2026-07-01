/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// A "pan" hand glyph for the canvas Hand tool, replacing EUI's `grab` icon
// (which renders as six dots and reads as a drag-handle, not a hand).
export function HandCursorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 11V6a1.5 1.5 0 0 0-3 0" />
      <path d="M15 6V4.5a1.5 1.5 0 0 0-3 0V6" />
      <path d="M12 6V5a1.5 1.5 0 0 0-3 0v6" />
      <path d="M9 9.5V8a1.5 1.5 0 0 0-3 0v6.5c0 3.5 2.5 6.5 6 6.5a6 6 0 0 0 6-6V9.5a1.5 1.5 0 0 0-3 0V11" />
    </svg>
  );
}
