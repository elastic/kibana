/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';

export interface AssistantAvatarProps {
  size?: keyof typeof sizeMap;
  // Required for EuiAvatar `iconType` prop
  // eslint-disable-next-line react/no-unused-prop-types
  children?: ReactNode;
}

export const sizeMap = {
  xl: 64,
  l: 48,
  m: 32,
  s: 24,
  xs: 16,
};

/**
 * Default Elastic AI Assistant logo
 *
 * TODO: Can be removed once added to EUI
 */
export const AssistantAvatar = ({ size = 's' }: AssistantAvatarProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={sizeMap[size]}
    height={sizeMap[size]}
    viewBox="0 0 64 64"
    fill="none"
  >
    <path fill="#F04E98" d="M36 28h24v36H36V28Z" />
    <path fill="#00BFB3" d="M4 46c0-9.941 8.059-18 18-18h6v36h-6c-9.941 0-18-8.059-18-18Z" />
    <path
      fill="#343741"
      d="M60 12c0 6.627-5.373 12-12 12s-12-5.373-12-12S41.373 0 48 0s12 5.373 12 12Z"
    />
    <path fill="#FA744E" d="M6 23C6 10.85 15.85 1 28 1v22H6Z" />
  </svg>
);
