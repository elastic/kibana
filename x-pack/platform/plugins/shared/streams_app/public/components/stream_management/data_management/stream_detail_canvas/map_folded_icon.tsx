/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * A folded-map glyph used for the collapsed minimap toggle.
 * There is no EUI icon for this, so we use a custom SVG.
 */
export function MapFoldedIcon(props: React.SVGProps<SVGSVGElement>) {
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
        d="M14.498 12L10.0029 14.0234L6.00293 12.3301L1.50293 14.0234V4.0127L6.00293 2L10.0029 4.0127L14.498 1.96875V12ZM6.50293 11.4551L9.50293 12.7246V4.87891L6.50293 3.37012V11.4551ZM10.5029 4.88281V12.7002L13.498 11.3525V3.52148L10.5029 4.88281ZM2.50293 4.66016V12.5781L5.50293 11.4492V3.31836L2.50293 4.66016Z"
        fill="currentColor"
      />
    </svg>
  );
}
