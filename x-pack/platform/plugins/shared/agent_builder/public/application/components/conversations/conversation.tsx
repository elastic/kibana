/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiOverflowScroll,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useConversationError, useHasActiveConversation } from '../../hooks/use_conversation';
import { ConversationInput } from './conversation_input/conversation_input';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useShouldStickToBottom } from '../../context/conversation/use_should_stick_to_bottom';
import { useSendMessage } from '../../context/send_message/send_message_context';
import { useConversationScrollActions } from '../../hooks/use_conversation_scroll_actions';
import { useConversationStatus } from '../../hooks/use_conversation';
import { useSendPredefinedInitialMessage } from '../../hooks/use_initial_message';
import {
  conversationElementPaddingStyles,
  conversationElementWidthStyles,
  fullWidthAndHeightStyles,
} from './conversation.styles';
import { ScrollButton } from './scroll_button';
import { useAppLeave } from '../../context/app_leave_context';
import { useNavigationAbort } from '../../hooks/use_navigation_abort';
import { ErrorPrompt } from '../common/prompt/error_prompt';
import { PROMPT_LAYOUT_VARIANTS } from '../common/prompt/layout';
import { StartNewConversationButton } from './actions/start_new_conversation_button';
import { CanvasProvider } from './conversation_rounds/round_response/attachments/canvas_context';
import { CanvasFlyout } from './conversation_rounds/round_response/attachments/canvas_flyout';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useConversation } from '../../hooks/use_conversation';
import type { CheckStaleAttachmentsResponse } from '../../../../common/http_api/attachments';
import { AttachmentPillsRow } from './conversation_input/attachment_pills_row';

const STALE_CHECK_DEBOUNCE_MS = 300;

export const Conversation: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { conversation } = useConversation();
  const conversationId = useConversationId();
  const hasActiveConversation = useHasActiveConversation();
  const { isResponseLoading } = useSendMessage();
  const { isFetched } = useConversationStatus();
  const { errorType } = useConversationError();
  const shouldStickToBottom = useShouldStickToBottom();
  const onAppLeave = useAppLeave();
  const { attachmentsService } = useAgentBuilderServices();
  const { attachments: stagedAttachments, upsertAttachments } = useConversationContext();
  const [staleResponse, setStaleResponse] = useState<CheckStaleAttachmentsResponse | undefined>(
    undefined
  );
  const staleCheckTimerRef = useRef<number | undefined>(undefined);
  const isStaleCheckInFlightRef = useRef(false);
  const hasPendingStaleCheckRef = useRef(false);
  const checkedSignatureByAttachmentIdRef = useRef<Map<string, string>>(new Map());

  useSendPredefinedInitialMessage();

  useNavigationAbort({
    onAppLeave,
    isResponseLoading,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { showScrollButton, smoothScrollToBottom, scrollToMostRecentRoundTop, stickToBottom } =
    useConversationScrollActions({
      isResponseLoading,
      conversationId: conversationId || '',
      scrollContainer: scrollContainerRef.current,
    });

  const scrollContainerHeight = scrollContainerRef.current?.clientHeight ?? 0;

  const latestAttachmentSignatures = useMemo(() => {
    return (conversation?.attachments ?? [])
      .map((attachment) => {
        const latestVersion = attachment.versions.find(
          (v) => v.version === attachment.current_version
        );
        return {
          attachmentId: attachment.id,
          signature: `${attachment.current_version}:${latestVersion?.content_hash ?? 'none'}`,
        };
      })
      .sort((a, b) => a.attachmentId.localeCompare(b.attachmentId));
  }, [conversation?.attachments]);

  const staleCheckKey = useMemo(() => {
    return latestAttachmentSignatures
      .map(({ attachmentId, signature }) => `${attachmentId}:${signature}`)
      .join('|');
  }, [latestAttachmentSignatures]);

  const runStaleCheck = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!conversationId) {
        setStaleResponse(undefined);
        return;
      }

      if (latestAttachmentSignatures.length === 0) {
        setStaleResponse(undefined);
        return;
      }

      const hasChangedSignatures = latestAttachmentSignatures.some(
        ({ attachmentId, signature }) => {
          return checkedSignatureByAttachmentIdRef.current.get(attachmentId) !== signature;
        }
      );

      if (!force && !hasChangedSignatures) {
        return;
      }

      if (isStaleCheckInFlightRef.current) {
        hasPendingStaleCheckRef.current = true;
        return;
      }

      isStaleCheckInFlightRef.current = true;
      try {
        const response = await attachmentsService.checkStale(conversationId);
        setStaleResponse(response);
        checkedSignatureByAttachmentIdRef.current = new Map(
          latestAttachmentSignatures.map(({ attachmentId, signature }) => [attachmentId, signature])
        );
      } finally {
        isStaleCheckInFlightRef.current = false;
        if (hasPendingStaleCheckRef.current) {
          hasPendingStaleCheckRef.current = false;
          runStaleCheck({ force: true });
        }
      }
    },
    [attachmentsService, conversationId, latestAttachmentSignatures]
  );

  const scheduleStaleCheck = useCallback(
    ({ force = false }: { force?: boolean } = {}) => {
      if (staleCheckTimerRef.current) {
        window.clearTimeout(staleCheckTimerRef.current);
      }

      staleCheckTimerRef.current = window.setTimeout(() => {
        runStaleCheck({ force });
      }, STALE_CHECK_DEBOUNCE_MS);
    },
    [runStaleCheck]
  );

  useEffect(() => {
    scheduleStaleCheck({ force: true });
  }, [conversationId, scheduleStaleCheck]);

  useEffect(() => {
    scheduleStaleCheck();
  }, [staleCheckKey, scheduleStaleCheck]);

  useEffect(() => {
    const onWindowFocus = () => {
      scheduleStaleCheck({ force: true });
    };

    window.addEventListener('focus', onWindowFocus);
    return () => {
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [scheduleStaleCheck]);

  useEffect(() => {
    return () => {
      if (staleCheckTimerRef.current) {
        window.clearTimeout(staleCheckTimerRef.current);
      }
    };
  }, []);

  const stagedAttachmentIds = useMemo(() => {
    return new Set((stagedAttachments ?? []).map((attachment) => attachment.id).filter(Boolean));
  }, [stagedAttachments]);

  const staleAttachmentPills = useMemo(() => {
    const attachmentsById = new Map(
      (conversation?.attachments ?? []).map((attachment) => [attachment.id, attachment])
    );

    return (staleResponse?.attachments ?? [])
      .filter((staleAttachment) => {
        return (
          staleAttachment.is_stale &&
          staleAttachment.resolved_data !== undefined &&
          !stagedAttachmentIds.has(staleAttachment.attachment_id)
        );
      })
      .map((staleAttachment) => {
        const conversationAttachment = attachmentsById.get(staleAttachment.attachment_id);
        const latestVersion = conversationAttachment?.versions.find(
          (version) => version.version === conversationAttachment.current_version
        );

        if (!conversationAttachment || !latestVersion) {
          return undefined;
        }

        return {
          id: conversationAttachment.id,
          type: conversationAttachment.type,
          data: latestVersion.data,
          hidden: conversationAttachment.hidden ?? false,
        };
      });
  }, [conversation?.attachments, stagedAttachmentIds, staleResponse?.attachments]);

  const filteredStaleAttachmentPills = useMemo(() => {
    return staleAttachmentPills.filter(
      (attachment): attachment is { id: string; type: string; data: unknown; hidden: boolean } =>
        attachment !== undefined
    );
  }, [staleAttachmentPills]);

  const hasStaleAttachments = filteredStaleAttachmentPills.length > 0;

  const handleStageStaleAttachments = useCallback(() => {
    if (!upsertAttachments || !conversation?.attachments || !staleResponse) {
      return;
    }

    const typeByAttachmentId = new Map(
      conversation.attachments.map((attachment) => [attachment.id, attachment.type])
    );
    const hiddenByAttachmentId = new Map(
      conversation.attachments.map((attachment) => [attachment.id, attachment.hidden ?? false])
    );
    const nextAttachments = attachmentsService.toAttachmentInputsFromStaleResponse(
      staleResponse,
      typeByAttachmentId,
      hiddenByAttachmentId
    );

    upsertAttachments(nextAttachments);
  }, [attachmentsService, conversation?.attachments, staleResponse, upsertAttachments]);

  const stalePanelTitle = i18n.translate('xpack.agentBuilder.conversation.staleAttachments.title', {
    defaultMessage: 'Some attachments are out of sync',
  });

  const stalePanelDescription = i18n.translate(
    'xpack.agentBuilder.conversation.staleAttachments.description',
    {
      defaultMessage:
        'These snapshots are older than their source data. Add updated attachments to the input to use them in your next message.',
    }
  );

  // Stick to bottom only when user returns to an existing conversation (conversationId is defined and changes)
  useEffect(() => {
    if (isFetched && conversationId && shouldStickToBottom) {
      requestAnimationFrame(() => {
        stickToBottom();
      });
    }
  }, [stickToBottom, isFetched, conversationId, shouldStickToBottom]);

  const containerStyles = css`
    ${fullWidthAndHeightStyles}
  `;

  const scrollMaskHeight = euiTheme.size.l;

  // Necessary to position the scroll button absolute to the container.
  const scrollWrapperStyles = css`
    ${fullWidthAndHeightStyles}
    position: relative;
    min-height: 0;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: ${scrollMaskHeight};
      pointer-events: none;
      z-index: 1;
      background: linear-gradient(to top, ${euiTheme.colors.backgroundBasePlain}, transparent);
    }
  `;

  const scrollableStyles = css`
    ${useEuiScrollBar()}
    ${useEuiOverflowScroll('y')}
  `;

  const inputPaddingStyles = css`
    padding-bottom: ${euiTheme.size.base};
  `;

  if (!hasActiveConversation) {
    return <NewConversationPrompt />;
  }

  if (errorType) {
    return (
      <ErrorPrompt
        errorType={errorType}
        variant={PROMPT_LAYOUT_VARIANTS.EMBEDDABLE}
        primaryButton={<StartNewConversationButton />}
      />
    );
  }

  return (
    <CanvasProvider>
      <EuiFlexGroup direction="column" alignItems="center" css={containerStyles} gutterSize="s">
        <EuiFlexItem grow={true} css={scrollWrapperStyles}>
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            ref={scrollContainerRef}
            css={scrollableStyles}
          >
            <EuiFlexItem css={[conversationElementWidthStyles, conversationElementPaddingStyles]}>
              <ConversationRounds scrollContainerHeight={scrollContainerHeight} />
            </EuiFlexItem>
          </EuiFlexGroup>
          {showScrollButton && <ScrollButton onClick={smoothScrollToBottom} />}
        </EuiFlexItem>
        <EuiFlexItem
          css={[
            conversationElementWidthStyles,
            conversationElementPaddingStyles,
            inputPaddingStyles,
          ]}
          grow={false}
        >
          {hasStaleAttachments && (
            <>
              <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
                <EuiText size="s">
                  <h4>{stalePanelTitle}</h4>
                  <p>{stalePanelDescription}</p>
                </EuiText>
                <EuiSpacer size="s" />
                <AttachmentPillsRow attachments={filteredStaleAttachmentPills} />
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton size="s" onClick={handleStageStaleAttachments}>
                      {i18n.translate(
                        'xpack.agentBuilder.conversation.staleAttachments.stageButton',
                        {
                          defaultMessage: 'Add updated attachments to input',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="m" />
            </>
          )}
          <ConversationInput
            onSubmit={scrollToMostRecentRoundTop}
            onFocus={() => scheduleStaleCheck({ force: true })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <CanvasFlyout attachmentsService={attachmentsService} />
    </CanvasProvider>
  );
};
