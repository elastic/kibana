/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ConversationParticipant } from '@kbn/agent-builder-common';

const COLLAPSED_PARTICIPANTS = 5;

const labels = {
  unknownUser: i18n.translate('xpack.agentBuilder.activityLog.unknownUser', {
    defaultMessage: 'Unknown user',
  }),
  showLess: i18n.translate('xpack.agentBuilder.activityLog.showLess', {
    defaultMessage: 'Show less',
  }),
};

interface ParticipantListProps {
  participants: ConversationParticipant[];
  profiles: Map<string, UserProfileWithAvatar>;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ participants, profiles }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hiddenCount = participants.length - COLLAPSED_PARTICIPANTS;
  const visible =
    isExpanded || hiddenCount <= 0 ? participants : participants.slice(0, COLLAPSED_PARTICIPANTS);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false} alignItems="flexStart">
      {visible.map(({ id }) => {
        const profile = profiles.get(id);
        return (
          <EuiFlexItem key={id} grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {profile && (
                <EuiFlexItem grow={false}>
                  <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {profile ? getUserDisplayName(profile.user) : labels.unknownUser}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
      {hiddenCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            data-test-subj="agentBuilderActivityLogToggleParticipants"
          >
            {isExpanded ? (
              labels.showLess
            ) : (
              <FormattedMessage
                id="xpack.agentBuilder.activityLog.showMore"
                defaultMessage="Show {count} more"
                values={{ count: hiddenCount }}
              />
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
