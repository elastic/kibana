/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useActiveConversationAttachments } from '../../../../../hooks/use_active_conversation_attachments';
import { useIsAgentWorkspaceMount } from '../../../../../hooks/use_navigation';
import { AttachmentCartCard } from './attachment_cart_card';

const labels = {
  emptyTitle: i18n.translate('xpack.agentBuilder.attachmentCartGrid.emptyTitle', {
    defaultMessage: 'No attachments',
  }),
  emptyBody: i18n.translate('xpack.agentBuilder.attachmentCartGrid.emptyBody', {
    defaultMessage: 'Attachments added to this conversation will appear here.',
  }),
  pinnedEmptyTitle: i18n.translate('xpack.agentBuilder.attachmentCartGrid.pinnedEmptyTitle', {
    defaultMessage: 'No pinned items',
  }),
  pinnedEmptyBody: i18n.translate('xpack.agentBuilder.attachmentCartGrid.pinnedEmptyBody', {
    defaultMessage: 'Pinned items will appear here.',
  }),
};

export const AttachmentCartGrid: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const attachments = useActiveConversationAttachments();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const emptyTitle = isAgentWorkspaceMount ? labels.pinnedEmptyTitle : labels.emptyTitle;
  const emptyBody = isAgentWorkspaceMount ? labels.pinnedEmptyBody : labels.emptyBody;

  const gridStyles = css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.m};
  `;

  if (attachments.length === 0) {
    return (
      <EuiEmptyPrompt
        icon={<EuiIcon type="folderOpen" size="xl" />}
        title={<h3>{emptyTitle}</h3>}
        body={emptyBody}
        data-test-subj="agentBuilderAttachmentCartEmpty"
      />
    );
  }

  return (
    <div css={gridStyles} data-test-subj="agentBuilderAttachmentCartGrid">
      {attachments.map((attachment) => (
        <AttachmentCartCard key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
};
