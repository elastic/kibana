/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { PANEL_PREVIEW_ATTACHMENT_TYPE, type PanelPreviewAttachmentData } from '../../common';

type PanelPreviewAttachment = UnknownAttachment & { data: PanelPreviewAttachmentData };

const getImageSrc = ({ data }: PanelPreviewAttachment) =>
  `data:${data.mime_type};base64,${data.data}`;

const PanelPreviewImage: React.FC<{ attachment: PanelPreviewAttachment }> = ({ attachment }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <img
      src={getImageSrc(attachment)}
      alt={attachment.data.title ?? attachment.data.panel_id}
      css={css`
        display: block;
        max-width: 100%;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.small};
      `}
    />
  );
};

/**
 * Shows the server-rendered PNG of a dashboard panel, the same image the agent was given.
 */
export const registerPanelPreviewAttachmentUiDefinition = (
  agentBuilder: AgentBuilderPluginStart
) => {
  agentBuilder.attachments.addAttachmentType<PanelPreviewAttachment>(
    PANEL_PREVIEW_ATTACHMENT_TYPE,
    {
      getLabel: (attachment) =>
        attachment.data?.title ??
        i18n.translate('xpack.agentBuilderDashboards.attachments.panelPreview.label', {
          defaultMessage: 'Panel preview',
        }),
      getIcon: () => 'image',
      getThumbnail: getImageSrc,
      renderInlineContent: ({ attachment }) => <PanelPreviewImage attachment={attachment} />,
    }
  );
};
