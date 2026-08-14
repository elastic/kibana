/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';

export interface ConversationPermissions {
  rename: boolean;
  delete: boolean;
  update_access_control: boolean;
}

export type WithPermissions<T> = T & {
  permissions: ConversationPermissions;
};

export type ConversationWithPermissions = WithPermissions<Conversation>;

export type ConversationWithoutRoundsWithPermissions = WithPermissions<ConversationWithoutRounds>;

export const withPermissions = <T>(
  conversation: T,
  permissions: ConversationPermissions
): WithPermissions<T> => {
  return {
    ...conversation,
    permissions,
  };
};
