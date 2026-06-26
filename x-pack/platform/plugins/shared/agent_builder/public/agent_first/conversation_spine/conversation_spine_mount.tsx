/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { layoutLevels } from '@kbn/ui-chrome-layout-constants';
import type { AttachmentsService } from '../../services/attachments/attachements_service';
import { getApplicationWorkspaceMountElement } from '../../agent_workspace/agent_workspace_flyout_defaults';
import { useIsAgentWorkspaceMount } from '../../application/hooks/use_navigation';
import { useConversationSpineContext } from './conversation_spine_context';
import { GenericConversationSpine } from './generic_conversation_spine';

interface ConversationSpineMountProps {
  attachmentsService: AttachmentsService;
}

/**
 * Portals the generic conversation spine into the application workspace column.
 */
export const ConversationSpineMount: React.FC<ConversationSpineMountProps> = ({
  attachmentsService,
}) => {
  const { euiTheme } = useEuiTheme();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const { isSpineActive } = useConversationSpineContext();
  const [, retryMount] = useReducer((count) => count + 1, 0);

  useEffect(() => {
    if (!isAgentWorkspaceMount || !isSpineActive || getApplicationWorkspaceMountElement()) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      retryMount();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [isAgentWorkspaceMount, isSpineActive]);

  if (!isAgentWorkspaceMount || !isSpineActive) {
    return null;
  }

  const mountElement = getApplicationWorkspaceMountElement();
  if (!mountElement) {
    return null;
  }

  const mountStyles = css`
    position: absolute;
    inset: 0;
    z-index: ${layoutLevels.applicationTopBar + 1};
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  return createPortal(
    <div css={mountStyles}>
      <GenericConversationSpine attachmentsService={attachmentsService} />
    </div>,
    mountElement
  );
};
