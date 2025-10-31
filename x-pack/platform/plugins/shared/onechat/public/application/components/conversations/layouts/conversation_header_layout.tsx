/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ConversationCenter,
  ConversationGrid,
  ConversationLeft,
  ConversationRight,
} from '../conversation_grid';

interface ConversationHeaderLayoutProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * Layout wrapper for ConversationHeader content.
 * Applies the 5-column grid layout to position header sections.
 * This is a temporary wrapper until Phase 2 when we'll have context-specific layouts.
 */
export const ConversationHeaderLayout: React.FC<ConversationHeaderLayoutProps> = ({
  left,
  center,
  right,
}) => {
  return (
    <ConversationGrid>
      {left && <ConversationLeft>{left}</ConversationLeft>}
      {center && <ConversationCenter>{center}</ConversationCenter>}
      {right && <ConversationRight>{right}</ConversationRight>}
    </ConversationGrid>
  );
};
