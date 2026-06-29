/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { AttachmentsService } from '../../services/attachments/attachements_service';
import { applicationWorkspaceFixedOverlayStyles } from '../../agent_workspace/application_workspace_fixed_overlay_styles';
import { getApplicationWorkspaceMountElement } from '../../agent_workspace/agent_workspace_flyout_defaults';
import { useIsAgentWorkspaceMount } from '../../application/hooks/use_navigation';
import { useOptionalConversationSpineContext } from './conversation_spine_context';
import { GenericConversationSpine } from './generic_conversation_spine';

interface ConversationSpineMountProps {
  attachmentsService: AttachmentsService;
}

const spineEntrance = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/**
 * Portals the generic conversation spine into the application workspace column.
 */
export const ConversationSpineMount: React.FC<ConversationSpineMountProps> = ({
  attachmentsService,
}) => {
  const { euiTheme } = useEuiTheme();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const spineContext = useOptionalConversationSpineContext();
  const isSpineActive = spineContext?.isSpineActive ?? false;
  const hasAttachments = spineContext?.hasAttachments ?? false;
  const [, retryMount] = useReducer((count) => count + 1, 0);

  useEffect(() => {
    if (!isAgentWorkspaceMount || !isSpineActive || !hasAttachments || getApplicationWorkspaceMountElement()) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      retryMount();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [hasAttachments, isAgentWorkspaceMount, isSpineActive]);

  if (!isAgentWorkspaceMount || !isSpineActive || !hasAttachments) {
    return null;
  }

  const mountElement = getApplicationWorkspaceMountElement();
  if (!mountElement) {
    return null;
  }

  const mountStyles = css`
    ${applicationWorkspaceFixedOverlayStyles};
    background: ${euiTheme.colors.backgroundBasePlain};
    animation: ${spineEntrance} 200ms ease-out;
  `;

  return createPortal(
    <div css={mountStyles}>
      <GenericConversationSpine attachmentsService={attachmentsService} />
    </div>,
    mountElement
  );
};
