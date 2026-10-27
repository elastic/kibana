/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, forwardRef, useContext, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiAvatar, EuiText, useEuiTheme } from '@elastic/eui';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';

const MENTIONS_MENU_WIDTH = 320;
const MAX_VISIBLE_ROWS = 7;

export type MentionKind = 'user' | 'agent';

export interface PocMentionable {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly kind: MentionKind;
}

/**
 * POC: who can be mentioned in the current conversation.
 * Real impl: the conversation's agent + `_suggest_user_profiles` (public) or the ACL members (private).
 */
export interface PocMentionScope {
  readonly agentName: string;
  readonly users: readonly PocMentionable[];
}

// POC: fake user profiles, ids look like real profile uids
export const POC_SPACE_USERS: readonly PocMentionable[] = [
  { id: 'u_julian_0', name: 'Julian Rosado', subtitle: 'julian.rosado', kind: 'user' },
  { id: 'u_pierre_0', name: 'Pierre Gayvallet', subtitle: 'pierre.gayvallet', kind: 'user' },
  { id: 'u_graham_0', name: 'Graham Hudgins', subtitle: 'graham.hudgins', kind: 'user' },
  { id: 'u_sander_0', name: 'Sander Philipse', subtitle: 'sander.philipse', kind: 'user' },
  { id: 'u_alex_0', name: 'Alex Marhaba', subtitle: 'alex.marhaba', kind: 'user' },
  { id: 'u_bran_0', name: 'Bran Castellano', subtitle: 'bran.castellano', kind: 'user' },
  { id: 'u_brian_0', name: 'Brian Pierce', subtitle: 'brian.pierce', kind: 'user' },
  { id: 'u_brianna_0', name: 'Brianna Thornton', subtitle: 'brianna.thornton', kind: 'user' },
  { id: 'u_phoebe_0', name: 'Phoebe Brix', subtitle: 'phoebe.brix', kind: 'user' },
  { id: 'u_chris_0', name: 'Chris Cressman', subtitle: 'chris.cressman', kind: 'user' },
  { id: 'u_giovanni_0', name: 'Giovanni Rossi', subtitle: 'giovanni.rossi', kind: 'user' },
  { id: 'u_maria_0', name: 'Maria Novak', subtitle: 'maria.novak', kind: 'user' },
];

const AGENT_MENTION_ID = 'agent';

const PocMentionScopeContext = createContext<PocMentionScope>({
  agentName: 'Elastic AI Agent',
  users: POC_SPACE_USERS,
});

export const PocMentionScopeProvider = PocMentionScopeContext.Provider;

export const Mentions = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect, onContentChange }, ref) => {
    const { euiTheme } = useEuiTheme();
    const { agentName, users } = useContext(PocMentionScopeContext);

    const mentionables: readonly PocMentionable[] = useMemo(
      () => [{ id: AGENT_MENTION_ID, name: agentName, subtitle: 'Agent', kind: 'agent' }, ...users],
      [agentName, users]
    );

    const rowStyles = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      min-width: 0;
    `;

    const options: CommandMenuListOption[] = useMemo(() => {
      const lowerQuery = query.toLowerCase();
      return mentionables
        .filter(
          ({ name, subtitle }) =>
            name.toLowerCase().includes(lowerQuery) || subtitle.toLowerCase().includes(lowerQuery)
        )
        .map(({ id, name, subtitle, kind }) => ({
          key: id,
          label: name,
          renderLabel: (
            <span css={rowStyles}>
              {kind === 'agent' ? (
                <EuiAvatar name={name} size="s" iconType="productAgent" color="subdued" />
              ) : (
                <EuiAvatar name={name} size="s" />
              )}
              <span>{name}</span>
              <EuiText size="xs" color="subdued" component="span">
                {subtitle}
              </EuiText>
            </span>
          ),
        }));
    }, [query, rowStyles, mentionables]);

    const hasVisibleContent = options.length > 0;
    useEffect(() => {
      onContentChange?.(hasVisibleContent, query);
    }, [hasVisibleContent, query, onContentChange]);

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        isLoading={false}
        onSelect={(option: CommandMenuListOption) => {
          const mentionable = mentionables.find(({ id }) => id === option.key);
          onSelect({
            commandId: CommandId.Mention,
            label: option.label,
            id: option.key,
            metadata: { kind: mentionable?.kind ?? 'user' },
          });
        }}
        width={MENTIONS_MENU_WIDTH}
        maxVisibleRows={MAX_VISIBLE_ROWS}
        showEnterHint
        data-test-subj="mentionsMenu"
      />
    );
  }
);

export interface PocMention {
  readonly name: string;
  readonly id: string;
  readonly kind: MentionKind;
}

// POC: matches serialized mention badges, e.g. [@Julian Rosado](mention://u_julian_0?kind=user)
const MENTION_PATTERN = /\[@([^\]]+)\]\(mention:\/\/([^?)]+)\?kind=(user|agent)\)/g;
const LEADING_MENTION_PATTERN = /^[\s​]*\[@([^\]]+)\]\(mention:\/\/([^?)]+)\?kind=(user|agent)\)/;

/** POC: reads mentions, in order, from serialized editor content. */
export const parsePocMentions = (content: string): PocMention[] =>
  Array.from(content.matchAll(MENTION_PATTERN), ([, name, id, kind]) => ({
    name,
    id,
    kind: kind as MentionKind,
  }));

/** POC: the mention the message starts with, if any. Only this one switches the posting mode. */
export const getPocLeadingMention = (content: string): PocMention | undefined => {
  const match = LEADING_MENTION_PATTERN.exec(content);
  if (!match) {
    return undefined;
  }
  const [, name, id, kind] = match;
  return { name, id, kind: kind as MentionKind };
};
