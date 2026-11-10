/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPrivatelySharedConversation,
  isPublicConversation,
  type ConversationAccessControl,
} from '@kbn/agent-builder-common';
import { labels } from './conversation_metadata_i18n';

/** Who can see the conversation: Private (author only), Restricted (invited members) or Public. */
export const getConversationVisibilityLabel = (
  accessControl: ConversationAccessControl | undefined
): string => {
  if (isPublicConversation(accessControl)) {
    return labels.public;
  }

  return isPrivatelySharedConversation(accessControl) ? labels.restricted : labels.private;
};
