/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplateUIContext } from '@kbn/agent-builder-browser';
import { appPaths } from './app_paths';
import { searchParamNames } from '../search_param_names';

type OpenFullscreenConversationOptions = Parameters<
  ConversationTemplateUIContext['openFullscreenConversation']
>[0];

/** Builds the app path that opens a conversation in full screen with the requested extras. */
export const buildFullscreenConversationPath = ({
  conversationId,
  agentId,
  openDetails,
  attachment,
}: OpenFullscreenConversationOptions): string => {
  const basePath = appPaths.agent.conversations.byId({ agentId, conversationId });
  const params = new URLSearchParams();
  if (openDetails) {
    params.set(searchParamNames.openConversationDetails, 'true');
  }
  if (attachment) {
    params.set(searchParamNames.scrollToAttachmentId, attachment.id);
    if (attachment.version !== undefined) {
      params.set(searchParamNames.scrollToAttachmentVersion, String(attachment.version));
    }
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
};
