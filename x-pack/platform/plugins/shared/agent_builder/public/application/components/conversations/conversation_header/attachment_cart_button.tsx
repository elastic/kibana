/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiButtonIcon, EuiNotificationBadge, EuiPopover, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CART_RAIL_POPOVER_MAX_HEIGHT,
  CART_RAIL_WIDTH,
} from '../../../../agent_first/conversation_spine/cart_rail/cart_rail.constants';
import { CartRailContent } from '../../../../agent_first/conversation_spine/cart_rail/cart_rail_content';
import { useOptionalCartRailContext } from '../../../../agent_first/conversation_spine/cart_rail/cart_rail_context';
import { CartRailPanel } from '../../../../agent_first/conversation_spine/cart_rail/cart_rail_panel';
import { useIsCartRailOpen } from '../../../../agent_first/conversation_spine/cart_rail/use_is_cart_rail_open';
import {
  registerAgentCartButtonElement,
  subscribeCartPulse,
  subscribeCartReceiving,
} from '../../../../agent_first/attachment_coordinator/coordinator_bridge';
import { useOptionalConversationSpineContext } from '../../../../agent_first/conversation_spine/conversation_spine_context';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useActiveConversationAttachmentCount } from '../../../hooks/use_active_conversation_attachment_count';
import { useIsAgentWorkspaceMount } from '../../../hooks/use_navigation';
import { useCanvasContext } from '../conversation_rounds/round_response/attachments/canvas_context';

const labels = {
  attachments: (count: number) =>
    i18n.translate('xpack.agentBuilder.conversationHeader.attachmentCart.ariaLabel', {
      defaultMessage: '{count, plural, one {# attachment} other {# attachments}}',
      values: { count },
    }),
  pinnedItems: i18n.translate('xpack.agentBuilder.conversationHeader.attachmentCart.pinnedItems', {
    defaultMessage: 'Pinned items',
  }),
  pinnedItemsAria: (count: number) =>
    i18n.translate('xpack.agentBuilder.conversationHeader.attachmentCart.pinnedItemsAria', {
      defaultMessage: '{count, plural, one {# pinned item} other {# pinned items}}',
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
  const { attachmentsService } = useAgentBuilderServices();
  const spineContext = useOptionalConversationSpineContext();
  const cartRailContext = useOptionalCartRailContext();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const isCartRailOpen = useIsCartRailOpen();
  const pulseTimeoutRef = useRef<number | undefined>(undefined);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  const isPopoverMode = isAgentWorkspaceMount && (cartRailContext?.isPopoverMode ?? false);
  const showCartPopover = isPopoverMode && isCartRailOpen;

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
      if (!spineContext.hasAttachments) {
        if (spineContext.isAttachmentsEmptyOpen) {
          spineContext.closeAttachmentsEmptyOverlay();
        } else {
          spineContext.openAttachmentsEmptyOverlay();
        }
        return;
      }

      if (spineContext.isSpineActive) {
        spineContext.closeSpine();
        return;
      }

      spineContext.openSpine({
        tabId: 'attachments',
        attachmentsView: { mode: 'grid' },
        isSidebar: false,
      });
      return;
    }
    openAttachmentCart(isEmbeddedContext);
  }, [isAgentWorkspaceMount, isEmbeddedContext, spineContext, openAttachmentCart]);

  const closeCartPopover = useCallback(() => {
    if (!spineContext) {
      return;
    }

    if (spineContext.hasAttachments && spineContext.isSpineActive) {
      spineContext.closeSpine();
      return;
    }

    spineContext.closeAttachmentsEmptyOverlay();
  }, [spineContext]);

  const cartIconType = isReceiving ? 'folderOpen' : 'folder';
  const tooltipContent = isAgentWorkspaceMount
    ? labels.pinnedItems
    : labels.attachments(attachmentCount);
  const ariaLabel = isAgentWorkspaceMount
    ? labels.pinnedItemsAria(attachmentCount)
    : labels.attachments(attachmentCount);

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

  const cartButton = (
    <EuiToolTip content={tooltipContent} position="bottom" disableScreenReaderOutput>
      <EuiButtonIcon
        color="text"
        iconType={cartIconType}
        size="xs"
        aria-label={ariaLabel}
        aria-expanded={showCartPopover}
        data-test-subj="agentBuilderAttachmentCartButton"
        onClick={handleOpenCart}
        css={isPulsing ? pulseStyles : undefined}
      />
    </EuiToolTip>
  );

  const cartTrigger = (
    <span
      ref={setButtonWrapperRef}
      css={css`
        position: relative;
        display: inline-flex;
      `}
    >
      {cartButton}
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

  if (!showCartPopover) {
    return cartTrigger;
  }

  return (
    <EuiPopover
      isOpen={true}
      closePopover={closeCartPopover}
      anchorPosition="downRight"
      panelPaddingSize="none"
      panelStyle={{
        width: CART_RAIL_WIDTH,
        maxHeight: CART_RAIL_POPOVER_MAX_HEIGHT,
        overflow: 'hidden',
      }}
      button={cartTrigger}
      data-test-subj="agentBuilderCartRailPopover"
    >
      <CartRailPanel isPopoverMode data-test-subj="agentWorkspaceConversationSpineRail">
        <CartRailContent attachmentsService={attachmentsService} />
      </CartRailPanel>
    </EuiPopover>
  );
};
