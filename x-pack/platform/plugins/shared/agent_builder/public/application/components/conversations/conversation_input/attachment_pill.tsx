/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

const removeAriaLabel = i18n.translate('xpack.agentBuilder.attachmentPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment',
});

export interface AttachmentPillProps {
  attachment: Attachment;
  onRemoveAttachment?: () => void;
}

const DEFAULT_ICON = 'document';

/** Max width before label truncation and ellipsis apply (must match flex item cap in `attachment_pills_row`). */
export const ATTACHMENT_PILL_MAX_WIDTH_PX = 160;

export const AttachmentPill: React.FC<AttachmentPillProps> = ({
  attachment,
  onRemoveAttachment,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const { euiTheme } = useEuiTheme();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const [isHovered, setIsHovered] = useState(false);

  const displayName = uiDefinition?.getLabel(attachment) ?? attachment.type;
  const canRemoveAttachment = Boolean(onRemoveAttachment);
  const iconType = uiDefinition?.getIcon?.(attachment) ?? DEFAULT_ICON;

  const iconContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.l};
    height: ${euiTheme.size.l};
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  const labelTruncateStyles = css`
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    font-weight: ${euiTheme.font.weight.bold};
  `;

  const textCellStyles = css`
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  `;

  const flexGroupMinWidthStyles = css`
    min-width: 0;
  `;

  const flexItemLabelStyles = css`
    min-width: 0;
    flex-basis: 0;
  `;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      paddingSize="xs"
      css={css`
        width: 100%;
        max-width: ${ATTACHMENT_PILL_MAX_WIDTH_PX}px;
        min-width: 0;
        box-sizing: border-box;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.darkShade};
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-test-subj={`agentBuilderAttachmentPill-${attachment.id}`}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        className={flexGroupMinWidthStyles}
      >
        <EuiFlexItem grow={false}>
          <div className={iconContainerStyles}>
            <EuiIcon type={iconType} size="s" color="primary" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow className={flexItemLabelStyles}>
          <EuiText size="xs" className={textCellStyles}>
            <span className={labelTruncateStyles} title={displayName}>
              {displayName}
            </span>
          </EuiText>
        </EuiFlexItem>
        {canRemoveAttachment && isHovered && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              size="xs"
              color="text"
              aria-label={removeAriaLabel}
              onClick={onRemoveAttachment}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
