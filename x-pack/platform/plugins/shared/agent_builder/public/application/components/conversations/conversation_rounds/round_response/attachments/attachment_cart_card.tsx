/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useIsAgentWorkspaceMount } from '../../../../../hooks/use_navigation';
import { useAttachmentCartActivation } from './use_attachment_cart_activation';

const GROUP_ATTACHMENT_TYPE = 'group';
const DEFAULT_ICON = 'document';
const GROUP_ICON = 'boxesVertical';

export interface AttachmentCartCardProps {
  attachment: UnknownAttachment;
}

export const AttachmentCartCard: React.FC<AttachmentCartCardProps> = ({ attachment }) => {
  const { attachmentsService } = useAgentBuilderServices();
  const { activateAttachment } = useAttachmentCartActivation();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const { euiTheme } = useEuiTheme();

  const isGroupAttachment = attachment.type === GROUP_ATTACHMENT_TYPE;
  const uiDefinition = !isGroupAttachment
    ? attachmentsService.getAttachmentUiDefinition(attachment.type)
    : null;

  const isActivatable =
    uiDefinition != null &&
    (uiDefinition.getActionButtons !== undefined ||
      uiDefinition.renderCanvasContent !== undefined);

  const groupLabel =
    isGroupAttachment && typeof attachment.data === 'object' && attachment.data !== null
      ? (attachment.data as { label?: string }).label
      : undefined;

  const displayName = isGroupAttachment
    ? groupLabel ?? attachment.type
    : uiDefinition?.getLabel(attachment) ?? attachment.type;

  const iconType = isGroupAttachment
    ? GROUP_ICON
    : uiDefinition?.getIcon?.() ?? DEFAULT_ICON;

  const subtitle = !isGroupAttachment
    ? uiDefinition?.getHeader?.({ attachment })?.subtitle
    : undefined;

  const activationAriaLabel = isAgentWorkspaceMount
    ? i18n.translate('xpack.agentBuilder.attachmentCartCard.openPinnedItemAriaLabel', {
        defaultMessage: 'Open pinned item {title}',
        values: { title: displayName },
      })
    : i18n.translate('xpack.agentBuilder.attachmentCartCard.openAttachmentAriaLabel', {
        defaultMessage: 'Open attachment {title}',
        values: { title: displayName },
      });

  const handleActivate = useCallback(() => {
    if (!isActivatable) {
      return;
    }
    activateAttachment(attachment);
  }, [activateAttachment, attachment, isActivatable]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isActivatable) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateAttachment(attachment);
      }
    },
    [activateAttachment, attachment, isActivatable]
  );

  const iconContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  const titleStyles = css`
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  `;

  const subtitleStyles = css`
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  `;

  const panelStyles = css`
    height: 100%;
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.darkShade};
    ${isActivatable
      ? `
      cursor: pointer;
      transition: background-color ${euiTheme.animation.fast} ease-in-out,
        border-color ${euiTheme.animation.fast} ease-in-out;

      &:hover {
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        border-color: ${euiTheme.colors.borderStrongPrimary};
      }
    `
      : ''}
  `;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      paddingSize="s"
      css={panelStyles}
      data-test-subj={`agentBuilderAttachmentCartCard-${attachment.id}`}
      onClick={isActivatable ? handleActivate : undefined}
      onKeyDown={isActivatable ? handleKeyDown : undefined}
      role={isActivatable ? 'button' : undefined}
      tabIndex={isActivatable ? 0 : undefined}
      aria-label={isActivatable ? activationAriaLabel : undefined}
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
          min-width: 0;
        `}
      >
        <div className={iconContainerStyles}>
          <EuiIcon type={iconType} size="m" color="primary" aria-hidden={true} />
        </div>
        <EuiText size="xs" className={titleStyles}>
          <strong>{displayName}</strong>
        </EuiText>
        {subtitle ? (
          <EuiText size="xs" color="subdued" className={subtitleStyles}>
            {subtitle}
          </EuiText>
        ) : null}
      </div>
    </EuiPanel>
  );
};
