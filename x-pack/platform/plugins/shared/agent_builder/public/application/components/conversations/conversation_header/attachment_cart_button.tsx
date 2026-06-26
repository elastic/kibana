/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiButtonIcon, EuiNotificationBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useActiveConversationAttachmentCount } from '../../../hooks/use_active_conversation_attachment_count';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import {
  registerAgentCartButtonElement,
  subscribeCartPulse,
  subscribeCartReceiving,
} from '../../../../agent_first/attachment_coordinator/coordinator_bridge';
import { useOptionalConversationSpineContext } from '../../../../agent_first/conversation_spine/conversation_spine_context';
import { useCanvasContext } from '../conversation_rounds/round_response/attachments/canvas_context';
import { useIsAgentWorkspaceMount } from '../../../hooks/use_navigation';

const labels = {
  attachments: (count: number) =>
    i18n.translate('xpack.agentBuilder.conversationHeader.attachmentCart.ariaLabel', {
      defaultMessage: '{count, plural, one {# attachment} other {# attachments}}',
      values: { count },
    }),
};

const cartPulse = keyframes`
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
`;

const PULSE_DURATION_MS = 400;

export const AttachmentCartButton: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const attachmentCount = useActiveConversationAttachmentCount();
  const { isEmbeddedContext } = useConversationContext();
  const { openAttachmentCart } = useCanvasContext();
  const spineContext = useOptionalConversationSpineContext();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const pulseTimeoutRef = useRef<number | undefined>(undefined);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  const triggerPulse = useCallback(() => {
    window.clearTimeout(pulseTimeoutRef.current);
    setIsPulsing(false);

    requestAnimationFrame(() => {
      setIsPulsing(true);
      pulseTimeoutRef.current = window.setTimeout(() => {
        setIsPulsing(false);
      }, PULSE_DURATION_MS);
    });
  }, []);

  const setButtonWrapperRef = useCallback((node: HTMLSpanElement | null) => {
    registerAgentCartButtonElement(node);
  }, []);

  useEffect(() => {
    return () => {
      registerAgentCartButtonElement(null);
      window.clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return subscribeCartPulse(triggerPulse);
  }, [triggerPulse]);

  useEffect(() => {
    return subscribeCartReceiving(setIsReceiving);
  }, []);

  const handleOpenCart = useCallback(() => {
    if (isAgentWorkspaceMount && !isEmbeddedContext && spineContext) {
      spineContext.openSpine({
        tabId: 'attachments',
        attachmentsView: { mode: 'grid' },
        isSidebar: false,
      });
      return;
    }
    openAttachmentCart(isEmbeddedContext);
  }, [isAgentWorkspaceMount, isEmbeddedContext, spineContext, openAttachmentCart]);

  const cartIconType = isReceiving ? 'folderOpen' : 'folder';
  const ariaLabel = labels.attachments(attachmentCount);

  const badgeStyles = css`
    position: absolute;
    inset-block-start: -${euiTheme.size.xs};
    inset-inline-end: -${euiTheme.size.xs};
    pointer-events: none;
  `;

  const pulseStyles = css`
    transform-origin: center;
    animation: ${cartPulse} ${PULSE_DURATION_MS}ms ease-out;
  `;

  return (
    <span
      ref={setButtonWrapperRef}
      css={css`
        position: relative;
        display: inline-flex;
      `}
    >
      <EuiToolTip content={ariaLabel} position="bottom" disableScreenReaderOutput>
        <EuiButtonIcon
          color="text"
          iconType={cartIconType}
          size="xs"
          aria-label={ariaLabel}
          data-test-subj="agentBuilderAttachmentCartButton"
          onClick={handleOpenCart}
          css={isPulsing ? pulseStyles : undefined}
        />
      </EuiToolTip>
      {attachmentCount > 0 ? (
        <EuiNotificationBadge
          css={badgeStyles}
          color="accent"
          data-test-subj="agentBuilderAttachmentCartBadge"
        >
          {attachmentCount}
        </EuiNotificationBadge>
      ) : null}
    </span>
  );
};
