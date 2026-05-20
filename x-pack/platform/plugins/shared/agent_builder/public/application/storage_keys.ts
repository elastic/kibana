/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const storageKeys = {
  lastUsedConnector: 'agentBuilder.lastUsedConnector',
  welcomeMessageDismissed: 'agentBuilder.welcomeMessageDismissed',
  autoIncludeWarningDismissed: 'agentBuilder.autoIncludeWarningDismissed',

  getAgentIdKey: (spaceId: string): string => `agentBuilder.agentId.${spaceId}`,

  getLastConversationKey: (sessionTag?: string, agentId?: string): string => {
    const tag = sessionTag || 'default';
    const agent = agentId || 'default';
    return `agentBuilder.lastConversation.${tag}.${agent}`;
  },
};
