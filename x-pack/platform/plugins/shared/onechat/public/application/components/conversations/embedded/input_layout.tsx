/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SerializedStyles } from '@emotion/react';

export const EmbeddedConversationInput: React.FC<{
  children: React.ReactNode;
  className?: string | SerializedStyles;
}> = ({ children, className }) => {
  return <div css={className}>{children}</div>;
};
