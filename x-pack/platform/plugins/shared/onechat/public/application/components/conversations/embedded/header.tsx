/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHasActiveConversation } from '../../../hooks/use_conversation';
import { ConversationTitle } from '../conversation_title';

export const EmbeddedConversationHeader: React.FC<{}> = () => {
  const hasActiveConversation = useHasActiveConversation();

  if (!hasActiveConversation) {
    return null;
  }

  return <ConversationTitle />;
};
