/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedStyles } from '@emotion/react';
import React from 'react';
import { ConversationContent } from './conversation_grid';

interface ConversationInputLayoutProps {
  children: React.ReactNode;
  className?: string | SerializedStyles;
}

const ConversationInputLayout: React.FC<ConversationInputLayoutProps> = ({
  children,
  className,
}) => {
  return <ConversationContent css={className}>{children}</ConversationContent>;
};

export const FullScreenConversationInput: React.FC<{
  children: React.ReactNode;
  className?: string | SerializedStyles;
}> = ({ children, className }) => {
  return <ConversationInputLayout className={className}>{children}</ConversationInputLayout>;
};
