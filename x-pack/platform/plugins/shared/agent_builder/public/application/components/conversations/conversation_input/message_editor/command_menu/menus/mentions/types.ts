/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

export type MentionKind = 'user' | 'agent';

interface BaseMentionCandidate<TKind extends MentionKind> {
  readonly kind: TKind;
  readonly id: string;
  readonly name: string;
}

export interface UserMentionCandidate extends BaseMentionCandidate<'user'> {
  readonly profile: UserProfileWithAvatar;
}

export interface AgentMentionCandidate extends BaseMentionCandidate<'agent'> {
  readonly agent: AgentDefinition;
}

export type MentionCandidate = UserMentionCandidate | AgentMentionCandidate;
