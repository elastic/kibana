/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiButtonIcon, EuiNotificationBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useActiveConversationAttachmentCount } from '../../../hooks/use_active_conversation_attachment_count';
import {
  registerAgentCartButtonElement,
  subscribeCartPulse,
  subscribeCartReceiving,
} from '../../../../agent_first/attachment_coordinator/coordinator_bridge';

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
  const buttonWrapperRef = useRef<HTMLDivElement | null>(null);
  const pulseTimeoutRef = useRef<number | undefined>(undefined);
  const [isPulsing, setIsPulsing] = React.useState(false);
  const [isReceiving, setIsReceiving] = React.useState(false);

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

  const setButtonWrapperRef = useCallback((node: HTMLDivElement | null) => {
    buttonWrapperRef.current = node;
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

  const cartIconType = isReceiving ? 'folderOpen' : 'folder';

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
    <EuiToolTip content={labels.attachments(attachmentCount)} position="bottom">
      <div
        ref={setButtonWrapperRef}
        tabIndex={0}
        css={css`
          position: relative;
          display: inline-flex;
          ${isPulsing ? pulseStyles : undefined}
        `}
      >
        <EuiButtonIcon
          color="text"
          iconType={cartIconType}
          size="xs"
          aria-label={labels.attachments(attachmentCount)}
          data-test-subj="agentBuilderAttachmentCartButton"
        />
        {attachmentCount > 0 ? (
          <EuiNotificationBadge
            css={badgeStyles}
            color="accent"
            data-test-subj="agentBuilderAttachmentCartBadge"
          >
            {attachmentCount}
          </EuiNotificationBadge>
        ) : null}
      </div>
    </EuiToolTip>
  );
};
