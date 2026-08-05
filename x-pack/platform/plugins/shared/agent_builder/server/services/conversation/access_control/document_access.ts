/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '@kbn/agent-builder-common';
import type { ConversationPermissions } from '../../../../common/http_api/conversations';
import type { ConversationProperties } from '../client/storage';
import { hasConversationOwnerAccess } from './authorization';

export const getConversationPermissions = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name' | 'access_control'>;
  user: UserIdAndName;
}): ConversationPermissions => {
  const isOwner = hasConversationOwnerAccess({ conversation, user });

  return {
    rename: isOwner,
    delete: isOwner,
  };
};
