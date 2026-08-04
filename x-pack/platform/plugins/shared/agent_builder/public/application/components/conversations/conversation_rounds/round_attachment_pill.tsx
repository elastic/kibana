/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
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
import type { UnknownAttachment, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getVersion } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useOptionalCanvasContext } from './round_response/attachments/canvas_context';

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
  const { isEmbeddedContext } = useConversationContext();
  const canvasContext = useOptionalCanvasContext();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const versionData = getVersion(attachment, version);
  const versionTitle = versionData
    ? uiDefinition?.getLabel({
        id: attachment.id,
        type: attachment.type,
        data: versionData.data,

        ...(attachment.description !== undefined ? { description: attachment.description } : {}),
      })
    : undefined;

  const fallbackTitle = attachment.description || attachment.type;
  const title = versionTitle || fallbackTitle;
  const canOpenCanvas = Boolean(uiDefinition?.renderCanvasContent && canvasContext && versionData);

  const openAttachmentCanvas = useCallback(() => {
    if (!canvasContext || !versionData || !uiDefinition?.renderCanvasContent) {
      return;
    }
    const canvasAttachment: UnknownAttachment = {
      id: attachment.id,
      type: attachment.type,
      data: versionData.data,
      hidden: attachment.hidden,
      origin: attachment.origin,
      ...(attachment.description !== undefined ? { description: attachment.description } : {}),
      versionData: {
        version,
        versionCount: attachment.versions.length,
        createdAt: versionData.created_at,
        originSyncedAt: attachment.origin_snapshot_at,
      },
    };
    canvasContext.openCanvas(canvasAttachment, isEmbeddedContext);
  }, [
    attachment,
    canvasContext,
    isEmbeddedContext,
    uiDefinition?.renderCanvasContent,
    version,
    versionData,
  ]);

  const pillStyles = css`
    padding: ${euiTheme.size.xxs} ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.small};
    max-inline-size: ${MAX_PILL_WIDTH}px;
    ${canOpenCanvas
      ? `
      cursor: pointer;
      &:hover {
        background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
    `
      : ''}
  `;

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
        onClick={canOpenCanvas ? openAttachmentCanvas : undefined}
        role={canOpenCanvas ? 'button' : undefined}
        tabIndex={canOpenCanvas ? 0 : undefined}
        onKeyDown={
          canOpenCanvas
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openAttachmentCanvas();
                }
              }
            : undefined
        }
        aria-label={canOpenCanvas ? title : undefined}
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
