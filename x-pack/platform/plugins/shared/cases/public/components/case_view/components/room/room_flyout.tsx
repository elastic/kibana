/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import moment from 'moment';
import {
  EuiAccordion,
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiComment,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiInputPopover,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSelectable,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../../common/constants/attachments';
import { CaseAccessMode } from '../../../../../common/types/domain';
import type { CaseUI } from '../../../../../common/ui/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useCasesToast } from '../../../../common/use_cases_toast';
import { useBulkGetUserProfiles } from '../../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import type { OnUpdateFields } from '../../types';
import {
  AGENT_MENTION,
  getTriggerMode,
  toRoomMessages,
  type RoomMessage,
  useCaseRoom,
  usePostFromRoom,
  usePostedMessages,
  useRoomOpenState,
  useSendRoomMessage,
} from './use_room';
import * as i18n from './translations';

interface RoomFlyoutProps {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
  /** The viewer can chat with the agent (Agent Builder access). */
  hasAgentBuilder: boolean;
}

const isNoConnectorError = (error: unknown) =>
  String((error as { body?: { message?: string } })?.body?.message ?? error).includes(
    'No connector available'
  );

/**
 * The case's room: the team's chat for the case, docked beside it. It is an Agent Builder
 * conversation the case creates on first open; the agent answers only when it is on for the case
 * and someone mentions it. Discussion stays in Activity; Post to case is the bridge.
 */
export const RoomFlyout: React.FC<RoomFlyoutProps> = ({
  caseData,
  onUpdateField,
  hasAgentBuilder,
}) => {
  const titleId = useGeneratedHtmlId();
  const { permissions } = useCasesContext();
  const { agentBuilder } = useKibana().services;
  const { showSuccessToast, showErrorToast } = useCasesToast();
  const [isOpen, setOpen] = useRoomOpenState();
  const { room, conversation, conversationId } = useCaseRoom(caseData.id, isOpen);
  const send = useSendRoomMessage(caseData, conversationId);
  const post = usePostFromRoom(caseData.id);
  const { posted, markPosted } = usePostedMessages(caseData.id);
  const [text, setText] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [noConnector, setNoConnector] = useState(false);

  const agentEnabled = hasAgentBuilder && caseData.settings?.agent?.enabled === true;
  const canPost = permissions.update && hasAgentBuilder;
  const isRestricted = caseData.access?.mode === CaseAccessMode.RESTRICTED;
  const number = caseData.incrementalId != null ? `#${caseData.incrementalId}` : caseData.title;

  const assigneeIds = useMemo(() => caseData.assignees.map(({ uid }) => uid), [caseData.assignees]);
  const { data: profiles } = useBulkGetUserProfiles({ uids: assigneeIds });
  const mentionOptions: EuiSelectableOption[] = useMemo(
    () => [
      ...(agentEnabled ? [{ label: i18n.AGENT_NAME, key: 'agent' }] : []),
      ...assigneeIds.map((uid) => {
        const user = profiles?.get(uid)?.user;
        return { key: uid, label: user?.full_name || user?.username || uid };
      }),
    ],
    [agentEnabled, assigneeIds, profiles]
  );

  const chats = useMemo(
    () =>
      caseData.comments.flatMap((comment) =>
        comment.type === AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE &&
        'attachmentId' in comment &&
        typeof comment.attachmentId === 'string'
          ? [
              {
                id: comment.attachmentId,
                title:
                  (comment.metadata as { title?: string } | null | undefined)?.title ??
                  comment.attachmentId,
              },
            ]
          : []
      ),
    [caseData.comments]
  );

  if (!isOpen) return null;

  const onSend = () => {
    const message = text.trim();
    if (!message) return;
    const triggerMode = getTriggerMode(message, agentEnabled);
    setNoConnector(false);
    send.mutate(
      { text: message, triggerMode },
      {
        onSuccess: () => setText(''),
        onError: (error) => {
          if (triggerMode === 'always' && isNoConnectorError(error)) {
            setText('');
            setNoConnector(true);
            return;
          }
          showErrorToast(error as Error, { title: i18n.SEND_ERROR });
        },
      }
    );
  };

  const onPost = (message: RoomMessage) =>
    post.mutate(
      { eventId: message.id },
      {
        onSuccess: () => {
          markPosted(message.id);
          showSuccessToast(i18n.POSTED_TOAST_TITLE, i18n.POSTED_TOAST_TEXT);
        },
        onError: (error) => showErrorToast(error as Error, { title: i18n.POST_ERROR }),
      }
    );

  const messages = toRoomMessages(conversation.data?.events ?? [], i18n.UNKNOWN_AUTHOR);

  return (
    <EuiFlyout
      type="push"
      pushMinBreakpoint="xl"
      size={400}
      ownFocus={false}
      onClose={() => setOpen(false)}
      aria-labelledby={titleId}
      closeButtonProps={{ 'aria-label': i18n.CLOSE }}
      data-test-subj="case-view-room"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{i18n.TITLE}</h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued" data-test-subj="case-room-subtitle">
          {isRestricted
            ? i18n.SUBTITLE_RESTRICTED(number, caseData.assignees.length)
            : i18n.SUBTITLE_PUBLIC(number)}
        </EuiText>
        {hasAgentBuilder ? (
          <>
            <EuiSpacer size="s" />
            <EuiToolTip content={i18n.AGENT_TOOLTIP}>
              <EuiSwitch
                compressed
                label={agentEnabled ? i18n.AGENT_ON : i18n.AGENT_OFF}
                checked={agentEnabled}
                disabled={!permissions.update}
                onChange={(e) =>
                  onUpdateField({
                    key: 'settings',
                    value: { ...caseData.settings, agent: { enabled: e.target.checked } },
                  })
                }
                data-test-subj="case-room-agent-switch"
              />
            </EuiToolTip>
          </>
        ) : null}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {chats.length > 0 ? (
          <>
            <EuiAccordion
              id={`${titleId}-chats`}
              buttonContent={i18n.LINKED_CHATS(chats.length)}
              initialIsOpen
              data-test-subj="case-room-linked-chats"
            >
              <EuiSpacer size="s" />
              {chats.map((chat) => (
                <EuiFlexGroup
                  key={chat.id}
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  data-test-subj="case-room-linked-chat"
                >
                  <EuiFlexItem className="eui-textTruncate">
                    <EuiText size="s" className="eui-textTruncate" title={chat.title}>
                      {chat.title}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      onClick={() =>
                        void agentBuilder?.openConversationDetails({ conversationId: chat.id })
                      }
                      data-test-subj="case-room-open-chat"
                    >
                      {i18n.OPEN_CHAT}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ))}
              <EuiText size="xs" color="subdued">
                {i18n.CHATS_NOTE}
              </EuiText>
            </EuiAccordion>
            <EuiSpacer size="m" />
          </>
        ) : null}
        {!hasAgentBuilder ? (
          <>
            <EuiCallOut announceOnMount size="s" iconType="info" title={i18n.NO_AGENT_BUILDER} />
            <EuiSpacer size="m" />
          </>
        ) : null}
        {room.isError || conversation.isError ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            size="s"
            title={i18n.LOAD_ERROR_TITLE}
            data-test-subj="case-room-error"
          >
            <EuiButton
              size="s"
              color="danger"
              onClick={() => (room.isError ? room.refetch() : conversation.refetch())}
            >
              {i18n.RETRY}
            </EuiButton>
          </EuiCallOut>
        ) : room.isLoading || conversation.isLoading ? (
          <EuiSkeletonText lines={4} data-test-subj="case-room-loading" />
        ) : messages.length === 0 ? (
          <EuiText size="s" color="subdued" data-test-subj="case-room-empty">
            {i18n.EMPTY}
          </EuiText>
        ) : (
          <EuiCommentList aria-label={i18n.MESSAGE_LIST} data-test-subj="case-room-messages">
            {messages.map((message) => {
              const isPosted = posted.has(message.id);
              if (message.kind === 'person') {
                return (
                  <EuiComment
                    key={message.id}
                    username={message.author}
                    timelineAvatar={<EuiAvatar name={message.author} size="m" />}
                    timestamp={moment(message.createdAt).format('HH:mm')}
                    event=""
                    actions={
                      canPost && !isPosted ? (
                        <EuiToolTip content={i18n.POST_TO_CASE} disableScreenReaderOutput>
                          <EuiButtonIcon
                            iconType="share"
                            aria-label={i18n.POST_TO_CASE}
                            onClick={() => onPost(message)}
                            data-test-subj="case-room-post-input"
                          />
                        </EuiToolTip>
                      ) : undefined
                    }
                    data-test-subj="case-room-message"
                  >
                    <EuiText size="s">
                      <p>{message.text}</p>
                    </EuiText>
                  </EuiComment>
                );
              }
              const agentAvatar = (
                <EuiAvatar
                  name={i18n.AGENT_NAME}
                  initials={i18n.AGENT_INITIALS}
                  type="space"
                  color="subdued"
                  size="m"
                />
              );
              if (message.kind === 'agentWaiting') {
                return (
                  <EuiComment
                    key={message.id}
                    username={i18n.AGENT_NAME}
                    timelineAvatar={agentAvatar}
                    event=""
                    data-test-subj="case-room-agent-waiting"
                  >
                    <EuiCallOut
                      announceOnMount
                      size="s"
                      iconType="question"
                      title={i18n.AGENT_WAITING}
                    >
                      <EuiButtonEmpty
                        size="xs"
                        onClick={() =>
                          conversationId ? agentBuilder?.openChat({ conversationId }) : undefined
                        }
                        data-test-subj="case-room-answer-in-agent-builder"
                      >
                        {i18n.ANSWER_IN_AGENT_BUILDER}
                      </EuiButtonEmpty>
                    </EuiCallOut>
                  </EuiComment>
                );
              }
              return (
                <EuiComment
                  key={message.id}
                  username={i18n.AGENT_NAME}
                  timelineAvatar={agentAvatar}
                  timestamp={moment(message.createdAt).format('HH:mm')}
                  event=""
                  actions={
                    canPost ? (
                      isPosted ? (
                        <EuiText size="xs" color="subdued">
                          {i18n.POSTED_TO_CASE}
                        </EuiText>
                      ) : (
                        <EuiButtonEmpty
                          size="xs"
                          onClick={() => onPost(message)}
                          isLoading={post.isLoading && post.variables?.eventId === message.id}
                          data-test-subj="case-room-post-response"
                        >
                          {i18n.POST_TO_CASE}
                        </EuiButtonEmpty>
                      )
                    ) : undefined
                  }
                  data-test-subj="case-room-agent-message"
                >
                  <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
                    <EuiMarkdownFormat textSize="s">{message.text}</EuiMarkdownFormat>
                  </EuiPanel>
                </EuiComment>
              );
            })}
          </EuiCommentList>
        )}
        {send.isLoading && send.variables?.triggerMode === 'always' ? (
          <EuiText size="xs" color="subdued" data-test-subj="case-room-replying">
            {i18n.REPLYING}
          </EuiText>
        ) : null}
        {noConnector ? (
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="warning"
            title={i18n.NO_CONNECTOR}
            onDismiss={() => setNoConnector(false)}
            data-test-subj="case-room-no-connector"
          />
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {!permissions.update ? (
          <EuiText size="xs" color="subdued" data-test-subj="case-room-read-only">
            {i18n.READ_ONLY}
          </EuiText>
        ) : canPost ? (
          <>
            <EuiInputPopover
              isOpen={isMentionOpen}
              closePopover={() => setIsMentionOpen(false)}
              panelPaddingSize="none"
              fullWidth
              input={
                <EuiTextArea
                  fullWidth
                  rows={2}
                  resize="none"
                  aria-label={i18n.COMPOSER_LABEL}
                  placeholder={
                    agentEnabled ? i18n.PLACEHOLDER_WITH_AGENT : i18n.PLACEHOLDER_TEAM_ONLY
                  }
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setIsMentionOpen(/(^|\s)@$/.test(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isMentionOpen) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  data-test-subj="case-room-composer"
                />
              }
            >
              <EuiSelectable
                aria-label={i18n.MENTION_LIST}
                singleSelection
                options={mentionOptions}
                onChange={(options) => {
                  const picked = options.find((o) => o.checked === 'on');
                  if (picked) {
                    const mention = picked.key === 'agent' ? AGENT_MENTION : `@${picked.label}`;
                    setText((current) => `${current.replace(/@$/, '')}${mention} `);
                  }
                  setIsMentionOpen(false);
                }}
                data-test-subj="case-room-mentions"
              >
                {(list) => list}
              </EuiSelectable>
            </EuiInputPopover>
            <EuiSpacer size="xs" />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {agentEnabled ? i18n.HINT_WITH_AGENT : i18n.HINT_AGENT_OFF}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  onClick={onSend}
                  isLoading={send.isLoading}
                  isDisabled={!text.trim() || !conversationId}
                  data-test-subj="case-room-send"
                >
                  {i18n.SEND}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
RoomFlyout.displayName = 'RoomFlyout';
