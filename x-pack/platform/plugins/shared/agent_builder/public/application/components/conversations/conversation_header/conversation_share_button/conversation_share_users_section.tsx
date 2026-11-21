/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiTitle } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ConversationParticipantsList } from './conversation_participants_list';
import type { ParticipantProfile } from './conversation_participants_list';
import { agentAccessHelpLabel, usersSectionTitle } from './conversation_share_i18n';

export interface ConversationShareUsers {
  ownerProfile?: ParticipantProfile;
  profiles: UserProfileWithAvatar[];
  /** The author plus every invited member. */
  count: number;
  onRemove: (id: string) => void;
}

interface ConversationShareUsersSectionProps {
  users: ConversationShareUsers;
  isSaving: boolean;
  agentName?: string;
}

export const ConversationShareUsersSection: React.FC<ConversationShareUsersSectionProps> = ({
  users,
  isSaving,
  agentName,
}) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    data-test-subj="agentBuilderConversationSharingUsersSection"
  >
    <EuiTitle size="xxxs">
      <h4>{usersSectionTitle(users.count)}</h4>
    </EuiTitle>
    {agentName ? (
      <KbnWarningCallout
        size="s"
        title={undefined}
        text={agentAccessHelpLabel(agentName)}
        data-test-subj="agentBuilderConversationSharingAgentAccessWarning"
      />
    ) : null}
    <ConversationParticipantsList
      ownerProfile={users.ownerProfile}
      memberProfiles={users.profiles}
      isSaving={isSaving}
      onRemoveUser={users.onRemove}
    />
  </EuiFlexGroup>
);
