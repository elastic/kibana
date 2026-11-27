/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { Actor } from '../../../../common/investigations/types';
import { ActorAvatar } from '../shared';
import * as i18n from './translations';

const MAX_AVATARS = 4;

export interface ParticipantAvatarsProps {
  participants: Actor[];
}

/** A row of participant avatars with a "+N" count and a tooltip that names everyone. */
export const ParticipantAvatars: React.FC<ParticipantAvatarsProps> = ({ participants }) => {
  if (participants.length === 0) {
    return null;
  }
  const shown = participants.slice(0, MAX_AVATARS);
  const hidden = participants.length - shown.length;
  const names = participants.map(({ name }) => name).join(', ');

  return (
    <EuiToolTip content={names} title={i18n.PARTICIPANTS}>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        tabIndex={0}
        aria-label={`${i18n.PARTICIPANTS}: ${names}`}
        data-test-subj="investigationConversationParticipants"
      >
        {shown.map((actor) => (
          <EuiFlexItem grow={false} key={`${actor.type}-${actor.id}`}>
            <ActorAvatar actor={actor} />
          </EuiFlexItem>
        ))}
        {hidden > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {`+${hidden}`}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
ParticipantAvatars.displayName = 'ParticipantAvatars';
