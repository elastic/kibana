/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ConversationAccessControlMode {
  Private = 'private',
  Public = 'public',
}

export enum ConversationAccessControlRole {
  Member = 'member',
}

export type ConversationAccessControlPrincipalType = 'user';

export interface ConversationAccessControlEntry {
  type: ConversationAccessControlPrincipalType;
  id?: string;
  name: string;
  role: ConversationAccessControlRole;
}

export interface ConversationAccessControl {
  access_mode: ConversationAccessControlMode;
  entries: ConversationAccessControlEntry[];
}

export const getDefaultConversationAccessControl = (): ConversationAccessControl => ({
  access_mode: ConversationAccessControlMode.Private,
  entries: [],
});

export const normalizeConversationAccessControl = (
  accessControl: Partial<ConversationAccessControl> | undefined
): ConversationAccessControl => {
  const defaults = getDefaultConversationAccessControl();

  return {
    access_mode: accessControl?.access_mode ?? defaults.access_mode,
    entries: accessControl?.entries ?? defaults.entries,
  };
};
