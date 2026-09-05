/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  euiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getVersion } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

const MAX_PILL_WIDTH = 320;
const DEFAULT_ICON = 'document';

const pillTitleStyles = css(euiTextTruncate());

const pillTitleContainerStyles = css`
  min-inline-size: 0;
`;

export interface RoundAttachmentPillProps {
  attachment: VersionedAttachment;
  version: number;
}

export const RoundAttachmentPill: React.FC<RoundAttachmentPillProps> = ({
  attachment,
  version,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachmentsService } = useAgentBuilderServices();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const versionData = getVersion(attachment, version);
  const attachmentForUi = versionData
    ? {
        id: attachment.id,
        type: attachment.type,
        data: versionData.data,
        ...(attachment.description !== undefined ? { description: attachment.description } : {}),
      }
    : undefined;

  const versionTitle = attachmentForUi ? uiDefinition?.getLabel(attachmentForUi) : undefined;
  const fallbackTitle = attachment.description || attachment.type;
  const title = versionTitle || fallbackTitle;

  const thumbnailUrl = attachmentForUi ? uiDefinition?.getThumbnail?.(attachmentForUi) : undefined;

  const pillStyles = css`
    padding: ${euiTheme.size.xxs} ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.small};
    max-inline-size: ${MAX_PILL_WIDTH}px;
  `;

  if (thumbnailUrl) {
    return (
      <EuiToolTip content={title} position="top">
        <div
          css={css`
            width: 72px; // no token value
            height: ${euiTheme.size.xl};
            border-radius: ${euiTheme.border.radius.small};
            overflow: hidden;
            flex-shrink: 0;
          `}
          tabIndex={0}
          data-test-subj="agentBuilderRoundAttachmentReferencePill"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            css={css`
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            `}
          />
        </div>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip content={title} position="top">
      <EuiPanel
        color="subdued"
        paddingSize="none"
        hasShadow={false}
        hasBorder={false}
        grow={false}
        css={pillStyles}
        data-test-subj="agentBuilderRoundAttachmentReferencePill"
      >
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={uiDefinition?.getIcon?.() ?? DEFAULT_ICON} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={pillTitleContainerStyles}>
            <EuiText size="s" css={pillTitleStyles}>
              {title}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiToolTip>
  );
};
