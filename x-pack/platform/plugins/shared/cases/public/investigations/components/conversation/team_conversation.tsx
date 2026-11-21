/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { ParticipantAvatars } from './participant_avatars';
import { TeamDiscussion } from './team_discussion';
import { useFillViewportHeight } from './use_fill_viewport_height';
import { useTeamDiscussion } from './use_team_discussion';
import * as i18n from './translations';

const MIN_HEIGHT = 480;
const PAGE_BOTTOM_GAP = 32;

export interface TeamConversationProps {
  record: InvestigationRecord;
  /** Why there is no agent conversation. */
  explanation: string;
}

/** The Conversation tab when no agent takes part: an explanation and the team's discussion. */
export const TeamConversation: React.FC<TeamConversationProps> = ({ record, explanation }) => {
  const { euiTheme } = useEuiTheme();
  const { ref, height } = useFillViewportHeight(MIN_HEIGHT, PAGE_BOTTOM_GAP);
  const { messageCount } = useTeamDiscussion(record);

  return (
    <div
      ref={ref}
      style={{ blockSize: height }}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
      `}
      data-test-subj="investigationConversationTab"
    >
      <EuiCallOut
        announceOnMount={false}
        size="s"
        iconType={ICONS.info}
        title={explanation}
        css={css`
          flex: 0 0 auto;
        `}
        data-test-subj="investigationConversationNoAgent"
      />
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
        wrap
        responsive={false}
        css={css`
          flex: 0 0 auto;
        `}
      >
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{i18n.TEAM_DISCUSSION}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <span data-test-subj="investigationConversationMessageCount">
              {i18n.TEAM_MESSAGE_COUNT(messageCount)}
            </span>
            {' · '}
            {i18n.HEADER_HINT}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ParticipantAvatars participants={record.participants} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          flex: 1 1 auto;
          min-block-size: 0;
        `}
      >
        <TeamDiscussion record={record} />
      </div>
    </div>
  );
};
TeamConversation.displayName = 'TeamConversation';
