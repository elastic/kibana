/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationContent } from '../conversation_grid';

interface ConversationRoundsLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const ConversationRoundsLayout: React.FC<ConversationRoundsLayoutProps> = ({
  children,
  className,
}) => {
  return <ConversationContent className={className}>{children}</ConversationContent>;
};
