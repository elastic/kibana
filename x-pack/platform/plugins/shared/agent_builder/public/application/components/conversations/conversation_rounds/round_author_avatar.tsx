/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';
import type { ConversationRoundOrigin } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { useRoundAuthorDetails } from '../../../hooks/use_round_author_details';
import { AgentAvatar } from '../../common/agent_avatar';
import type { RoundAuthor } from './round_author';

interface RoundAuthorAvatarProps {
  agent?: AgentDefinition;
  author?: RoundAuthor;
  origin?: ConversationRoundOrigin;
}

export const RoundAuthorAvatar: React.FC<RoundAuthorAvatarProps> = ({ agent, author, origin }) => {
  const { authorProfile, name } = useRoundAuthorDetails({ agent, author, origin });

  if (agent) {
    return <AgentAvatar agent={agent} size="s" iconPaddingSize="none" />;
  }

  if (authorProfile) {
    return <UserAvatar user={authorProfile.user} avatar={authorProfile.data?.avatar} size="s" />;
  }

  if (name) {
    return <EuiAvatar size="s" name={name} />;
  }

  return null;
};
