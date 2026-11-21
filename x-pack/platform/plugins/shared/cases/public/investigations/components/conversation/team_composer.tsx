/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord, RecordComment } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { MarkdownEditor } from '../../../components/markdown_editor';
import type { MarkdownEditorRef } from '../../../components/markdown_editor';
import { useAddComment } from '../../hooks';
import { ICONS } from '../../icons';
import { ActorAvatar } from '../shared';
import { toExcerpt } from './messages';
import { getMentionableActors } from './use_team_discussion';
import * as i18n from './translations';

const EDITOR_HEIGHT = 64;
const DISABLED_UI_PLUGINS = ['lens'];

export interface TeamComposerHandle {
  focus: () => void;
}

export interface TeamComposerProps {
  record: InvestigationRecord;
  /** The draft is owned by the parent so the Quote action can add to it. */
  draft: string;
  onDraftChange: (draft: string) => void;
  /** Set to post the draft as a reply to this comment. */
  replyTo?: RecordComment | null;
  onCancelReply?: () => void;
  onSent?: () => void;
  'data-test-subj'?: string;
}

const getAuthorName = (comment: RecordComment): string =>
  comment.created_by.full_name || comment.created_by.username || i18n.UNKNOWN_AUTHOR;

/** A comment box with the Cases Markdown editor. Enter sends, Shift+Enter adds a line. */
export const TeamComposer = forwardRef<TeamComposerHandle, TeamComposerProps>(
  (
    {
      record,
      draft,
      onDraftChange,
      replyTo = null,
      onCancelReply,
      onSent,
      'data-test-subj': dataTestSubj = 'investigationTeamComposer',
    },
    ref
  ) => {
    const { euiTheme } = useEuiTheme();
    const editorId = useGeneratedHtmlId({ prefix: 'investigationTeamComposerEditor' });
    const editorRef = useRef<MarkdownEditorRef | null>(null);
    const [isMentionOpen, setIsMentionOpen] = useState(false);
    const { mutateAsync, isLoading } = useAddComment(record.id);

    useImperativeHandle(ref, () => ({ focus: () => editorRef.current?.textarea?.focus() }), []);

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
      const content = draft.trim();
      if (content.length === 0 || isLoading) {
        return;
      }
      try {
        await mutateAsync({ content, ...(replyTo ? { reply_to: replyTo.id } : {}) });
        onDraftChange('');
        onSent?.();
      } catch {
        // The mutation hook already reported the error; the draft stays.
      }
    };

    const insertMention = (name: string) => {
      setIsMentionOpen(false);
      const separator = draft.length === 0 || /\s$/.test(draft) ? '' : ' ';
      onDraftChange(`${draft}${separator}@${name} `.slice(0, INVESTIGATION_LIMITS.maxTextLength));
      editorRef.current?.textarea?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { target, key, shiftKey, nativeEvent } = event;
      if (
        key === 'Enter' &&
        !shiftKey &&
        !nativeEvent.isComposing &&
        target instanceof HTMLTextAreaElement
      ) {
        event.preventDefault();
        void send();
      }
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
        {replyTo ? (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            css={css`
              margin-block-end: ${euiTheme.size.s};
              padding-inline-start: ${euiTheme.size.s};
              border-inline-start: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
            `}
            data-test-subj="investigationTeamReplyingTo"
          >
            <EuiFlexItem
              css={css`
                min-width: 0;
              `}
            >
              <EuiText size="xs">
                <strong>{i18n.REPLYING_TO(getAuthorName(replyTo))}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued" className="eui-textTruncate">
                {toExcerpt(replyTo.content, 140)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.CANCEL_REPLY} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.close}
                  size="xs"
                  color="text"
                  aria-label={i18n.CANCEL_REPLY}
                  onClick={onCancelReply}
                  data-test-subj="investigationTeamReplyCancel"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        {/* The Enter shortcut is read from the editor's textarea as the event bubbles up. */}
        <div onKeyDown={onKeyDown} role="presentation">
          <MarkdownEditor
            ref={editorRef}
            ariaLabel={replyTo ? i18n.REPLY_PLACEHOLDER : i18n.WRITE_MESSAGE}
            editorId={editorId}
            value={draft}
            onChange={(value) => onDraftChange(value.slice(0, INVESTIGATION_LIMITS.maxTextLength))}
            height={EDITOR_HEIGHT}
            disabledUiPlugins={DISABLED_UI_PLUGINS}
            data-test-subj={`${dataTestSubj}Input`}
          />
        </div>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
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
              {replyTo ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    onClick={onCancelReply}
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
                  aria-label={replyTo ? i18n.REPLY : i18n.SEND_ARIA}
                  onClick={() => void send()}
                  data-test-subj={`${dataTestSubj}Send`}
                >
                  {replyTo ? i18n.REPLY : i18n.SEND}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);
TeamComposer.displayName = 'TeamComposer';
