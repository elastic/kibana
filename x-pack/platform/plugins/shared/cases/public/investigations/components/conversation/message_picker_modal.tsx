/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ICONS } from '../../icons';
import { ActorAvatar, EmptyState, ErrorState, LoadingState, RelativeTime } from '../shared';
import type { ConversationMessage } from './messages';
import { toExcerpt } from './messages';
import type { PinnedClaim } from './use_claim_sources';
import * as i18n from './translations';

export interface MessagePickerModalProps {
  messages: ConversationMessage[];
  isLoading: boolean;
  error: unknown;
  /** Claims already created from a message, by message id. */
  pinned: Map<string, PinnedClaim>;
  onPick: (message: ConversationMessage) => void;
  onClose: () => void;
}

/** Lists the recent messages of a conversation, newest first, and returns the one chosen. */
export const MessagePickerModal: React.FC<MessagePickerModalProps> = ({
  messages,
  isLoading,
  error,
  pinned,
  onPick,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const newestFirst = [...messages].reverse();
    if (needle.length === 0) {
      return newestFirst;
    }
    return newestFirst.filter(
      ({ text, authorName }) =>
        text.toLowerCase().includes(needle) || authorName.toLowerCase().includes(needle)
    );
  }, [messages, query]);

  const selected = messages.find(({ id }) => id === selectedId) ?? null;

  const renderBody = () => {
    if (isLoading) {
      return <LoadingState label={i18n.PICKER_LOADING} size="m" />;
    }
    if (error) {
      return <ErrorState title={i18n.CONVERSATION_LOAD_ERROR} error={error} />;
    }
    if (messages.length === 0) {
      return <EmptyState title={i18n.PICKER_EMPTY} iconType={ICONS.conversation} />;
    }
    return (
      <>
        <EuiFieldSearch
          fullWidth
          compressed
          incremental
          value={query}
          placeholder={i18n.PICKER_SEARCH}
          aria-label={i18n.PICKER_SEARCH}
          onChange={(event) => setQuery(event.target.value)}
          data-test-subj="investigationMessagePickerSearch"
        />
        <EuiSpacer size="s" />
        {visible.length === 0 ? (
          <EuiText size="s" color="subdued">
            <p>{i18n.PICKER_NO_MATCH}</p>
          </EuiText>
        ) : (
          <ul
            css={css`
              max-block-size: 22rem;
              overflow-y: auto;
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
            `}
            data-test-subj="investigationMessagePickerList"
          >
            {visible.map((message) => {
              const isSelected = message.id === selectedId;
              const pinnedClaim = pinned.get(message.id);
              return (
                <li
                  key={message.id}
                  css={css`
                    border-block-end: ${euiTheme.border.thin};
                    &:last-child {
                      border-block-end: none;
                    }
                  `}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={i18n.PICKER_SELECT_MESSAGE(i18n.MESSAGE_LABEL(message.index))}
                    onClick={() => setSelectedId(message.id)}
                    onDoubleClick={() => onPick(message)}
                    css={css`
                      display: block;
                      inline-size: 100%;
                      text-align: start;
                      padding: ${euiTheme.size.s} ${euiTheme.size.m};
                      background-color: ${isSelected
                        ? euiTheme.colors.backgroundBaseInteractiveSelect
                        : 'transparent'};
                      &:hover {
                        background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
                      }
                      &:focus-visible {
                        outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
                        outline-offset: calc(${euiTheme.focus.width} * -1);
                      }
                    `}
                    data-test-subj="investigationMessagePickerOption"
                  >
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                      <EuiFlexItem grow={false}>
                        <ActorAvatar
                          actor={{
                            type: message.role === 'agent' ? 'agent' : 'user',
                            id: message.authorName,
                            name: message.authorName,
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>{message.authorName}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {i18n.MESSAGE_LABEL(message.index)} · <RelativeTime value={message.ts} />
                        </EuiText>
                      </EuiFlexItem>
                      {message.skippedAgent ? (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow">{i18n.SKIPPED_AGENT}</EuiBadge>
                        </EuiFlexItem>
                      ) : null}
                      {pinnedClaim ? (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="success" iconType={ICONS.check}>
                            {i18n.CLAIM_ALREADY_PINNED(pinnedClaim.ref)}
                          </EuiBadge>
                        </EuiFlexItem>
                      ) : null}
                    </EuiFlexGroup>
                    <EuiText
                      size="s"
                      css={css`
                        margin-block-start: ${euiTheme.size.xs};
                      `}
                    >
                      {toExcerpt(message.text)}
                    </EuiText>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={720}
      data-test-subj="investigationMessagePickerModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.PICKER_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.PICKER_HELP}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {renderBody()}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationMessagePickerCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={!selected}
          onClick={() => selected && onPick(selected)}
          data-test-subj="investigationMessagePickerContinue"
        >
          {i18n.PICKER_CONTINUE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
MessagePickerModal.displayName = 'MessagePickerModal';
