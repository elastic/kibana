/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiTextArea,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useBulkCreateItems } from '../../hooks';
import { ICONS } from '../../icons';
import { ActorAvatar } from '../shared';
import { getMentionableActors } from './use_team_discussion';
import * as i18n from './translations';

export interface TeamComposerProps {
  record: InvestigationRecord;
  /** Set to post a reply under that message. */
  parentId?: string;
  placeholder?: string;
  ariaLabel?: string;
  onSent?: () => void;
  /** Closes a reply composer. */
  onCancel?: () => void;
  'data-test-subj'?: string;
}

/** A message box with an @mention picker. Enter sends, Shift+Enter adds a line. */
export const TeamComposer: React.FC<TeamComposerProps> = ({
  record,
  parentId,
  placeholder = i18n.COMPOSER_PLACEHOLDER,
  ariaLabel = i18n.WRITE_MESSAGE,
  onSent,
  onCancel,
  'data-test-subj': dataTestSubj = 'investigationTeamComposer',
}) => {
  const { euiTheme } = useEuiTheme();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const { mutateAsync, isLoading } = useBulkCreateItems(record.id);

  const actors = useMemo(() => getMentionableActors(record), [record]);
  const mentionOptions: EuiSelectableOption[] = useMemo(
    () =>
      actors.map((actor) => ({
        label: actor.name,
        key: actor.id,
        prepend: <ActorAvatar actor={actor} />,
        'data-test-subj': `investigationMentionOption-${actor.id}`,
      })),
    [actors]
  );

  const canSend = draft.trim().length > 0 && !isLoading;

  const send = async () => {
    const text = draft.trim();
    if (text.length === 0 || isLoading) {
      return;
    }
    try {
      await mutateAsync({
        items: [
          {
            kind: 'comment',
            text,
            comment: { target_id: record.id, ...(parentId ? { parent_id: parentId } : {}) },
          },
        ],
        extract_indicators: false,
      });
      setDraft('');
      onSent?.();
    } catch {
      // The mutation hook already reported the error; the draft stays.
    }
  };

  const insertMention = (name: string) => {
    setIsMentionOpen(false);
    setDraft((current) => {
      const separator = current.length === 0 || /\s$/.test(current) ? '' : ' ';
      return `${current}${separator}@${name} `.slice(0, INVESTIGATION_LIMITS.maxTextLength);
    });
    textareaRef.current?.focus();
  };

  return (
    <div
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
      data-test-subj={dataTestSubj}
    >
      <EuiTextArea
        inputRef={(node) => {
          textareaRef.current = node;
        }}
        fullWidth
        compressed
        resize="vertical"
        rows={parentId ? 2 : 3}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={INVESTIGATION_LIMITS.maxTextLength}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void send();
          }
        }}
        css={css`
          box-shadow: none;
          background-color: transparent;
        `}
        data-test-subj={`${dataTestSubj}Input`}
      />
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isMentionOpen}
            closePopover={() => setIsMentionOpen(false)}
            anchorPosition="upLeft"
            aria-label={i18n.MENTION}
            panelPaddingSize="none"
            button={
              <EuiToolTip content={i18n.MENTION} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.mention}
                  aria-label={i18n.MENTION}
                  onClick={() => setIsMentionOpen((open) => !open)}
                  data-test-subj={`${dataTestSubj}Mention`}
                />
              </EuiToolTip>
            }
          >
            <EuiSelectable
              searchable
              singleSelection
              options={mentionOptions}
              searchProps={{
                compressed: true,
                placeholder: i18n.MENTION_SEARCH,
                'aria-label': i18n.MENTION_SEARCH,
              }}
              emptyMessage={i18n.MENTION_EMPTY}
              listProps={{ showIcons: false }}
              height={Math.min(Math.max(actors.length, 1), 6) * 40 + 8}
              onChange={(options) => {
                const picked = options.find(({ checked }) => checked === 'on');
                if (picked) {
                  insertMention(picked.label);
                }
              }}
              data-test-subj={`${dataTestSubj}MentionList`}
            >
              {(list, search) => (
                <div
                  css={css`
                    inline-size: 16rem;
                  `}
                >
                  {search}
                  {list}
                </div>
              )}
            </EuiSelectable>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {onCancel ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={onCancel}
                  data-test-subj={`${dataTestSubj}Cancel`}
                >
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                iconType={ICONS.send}
                isLoading={isLoading}
                isDisabled={!canSend}
                aria-label={i18n.SEND_ARIA}
                onClick={() => void send()}
                data-test-subj={`${dataTestSubj}Send`}
              >
                {parentId ? i18n.REPLY : i18n.SEND}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
TeamComposer.displayName = 'TeamComposer';
