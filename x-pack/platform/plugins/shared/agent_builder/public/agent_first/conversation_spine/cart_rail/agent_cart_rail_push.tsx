/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import type { AttachmentsService } from '../../../services/attachments/attachements_service';
import { useIsAgentWorkspaceMount } from '../../../application/hooks/use_navigation';
import { useOptionalCartRailContext } from './cart_rail_context';
import { CartRailContent } from './cart_rail_content';
import { CartRailPanel } from './cart_rail_panel';
import { useIsCartRailOpen } from './use_is_cart_rail_open';
import { CART_RAIL_WIDTH } from './cart_rail.constants';

interface AgentCartRailPushProps {
  attachmentsService: AttachmentsService;
}

/**
 * Right-side push rail for the attachment cart, mirroring the left Agent Builder sidebar.
 */
export const AgentCartRailPush: React.FC<AgentCartRailPushProps> = ({ attachmentsService }) => {
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const cartRailContext = useOptionalCartRailContext();
  const isCartOpen = useIsCartRailOpen();
  const cartPushWidth = cartRailContext?.cartPushWidth ?? `${CART_RAIL_WIDTH}px`;

  if (!isAgentWorkspaceMount || !isCartOpen || cartRailContext?.isPopoverMode) {
    return null;
  }

  const pushRailStyles = css`
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: ${cartPushWidth};
    min-width: 0;
    min-height: 0;
    height: 100%;
  `;

  return (
    <div css={pushRailStyles}>
      <CartRailPanel data-test-subj="agentWorkspaceConversationSpineRail">
        <CartRailContent attachmentsService={attachmentsService} />
      </CartRailPanel>
    </div>
  );
};
