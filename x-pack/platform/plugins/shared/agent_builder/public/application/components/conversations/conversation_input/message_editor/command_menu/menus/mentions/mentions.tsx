/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';
import { AgentAvatar } from '../../../../../../common/agent_avatar';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';
import type { MentionCandidate } from './types';
import { useMentionCandidates } from './use_mention_candidates';

const MENTIONS_MENU_WIDTH = 320;

const getCandidateKey = ({ kind, id }: MentionCandidate): string => `${kind}:${id}`;

export const Mentions = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect, onContentChange }, ref) => {
    const { euiTheme } = useEuiTheme();
    const { candidates, isLoading } = useMentionCandidates(query);

    const rowStyles = useMemo(
      () => css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        min-width: 0;
      `,
      [euiTheme.size.s]
    );

    const options: CommandMenuListOption[] = useMemo(
      () =>
        candidates.map((candidate) => ({
          key: getCandidateKey(candidate),
          label: candidate.name,
          renderLabel: (
            <span css={rowStyles}>
              {candidate.kind === 'agent' ? (
                <AgentAvatar agent={candidate.agent} size="s" />
              ) : (
                <UserAvatar
                  user={candidate.profile.user}
                  avatar={candidate.profile.data?.avatar}
                  size="s"
                />
              )}
              <span>{candidate.name}</span>
            </span>
          ),
        })),
      [candidates, rowStyles]
    );

    // Closes the popover when nothing matches. Names have spaces, so queries can be many words.
    const hasVisibleContent = isLoading || options.length > 0;
    useEffect(() => {
      onContentChange?.(hasVisibleContent, query);
    }, [hasVisibleContent, query, onContentChange]);

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        // Keep found names on screen while the search runs
        isLoading={isLoading && options.length === 0}
        onSelect={(option: CommandMenuListOption) => {
          const candidate = candidates.find((item) => getCandidateKey(item) === option.key);
          if (!candidate) {
            return;
          }
          onSelect({
            commandId: CommandId.Mention,
            label: candidate.name,
            id: candidate.id,
            metadata: { kind: candidate.kind },
          });
        }}
        width={MENTIONS_MENU_WIDTH}
        data-test-subj="mentionsMenu"
      />
    );
  }
);
