/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentsService } from '../../services/attachments/attachements_service';
import { useConversationSpineContext } from './conversation_spine_context';
import { SpineHeader } from './components/spine_header';
import { SpineTabs } from './components/spine_tabs';
import { useEscapeKeyHandler } from './hooks/use_escape_key_handler';
import type { SpineHeaderSlots, SpineTabDefinition } from './types';

export interface GenericConversationSpineProps {
  attachmentsService: AttachmentsService;
  headerSlots?: SpineHeaderSlots;
  additionalTabs?: SpineTabDefinition[];
}

export const GenericConversationSpine: React.FC<GenericConversationSpineProps> = ({
  attachmentsService,
  headerSlots,
  additionalTabs,
}) => {
  const { euiTheme } = useEuiTheme();
  const { closeSpine, closeAttachmentPreview, spineState } = useConversationSpineContext();

  const onEscape = useCallback(() => {
    if (spineState?.attachmentsView.mode === 'attachment') {
      closeAttachmentPreview();
      return;
    }

    closeSpine();
  }, [closeAttachmentPreview, closeSpine, spineState?.attachmentsView.mode]);

  useEscapeKeyHandler(onEscape);

  const rootStyles = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  return (
    <div css={rootStyles} data-test-subj="agentWorkspaceConversationSpine">
      <SpineHeader onClose={closeSpine} headerSlots={headerSlots} />
      <SpineTabs attachmentsService={attachmentsService} additionalTabs={additionalTabs} />
    </div>
  );
};
