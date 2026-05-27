/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
  type EuiThemeComputed,
  type IconType,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useCanvasContext } from './round_response/attachments/canvas_context';

const USER_ATTACHMENT_PADDING_PX = 12;
const NIGHTSHIFT_SIGNIFICANT_EVENT_TYPE = 'nightshift.significantEvent';

const expandAriaLabel = i18n.translate('xpack.agentBuilder.roundUserAttachmentItem.expand', {
  defaultMessage: 'Expand attachment',
});

const getNightshiftLeadingIconTile = (
  severity: string | undefined,
  theme: EuiThemeComputed
): { background: string; iconColor: string } => {
  switch (severity) {
    case 'critical':
      return {
        background: theme.colors.backgroundBaseDanger,
        iconColor: theme.colors.textDanger,
      };
    case 'medium':
      return {
        background: theme.colors.backgroundBaseWarning,
        iconColor: theme.colors.textWarning,
      };
    case 'low':
    default:
      return {
        background: theme.colors.borderBaseSubdued,
        iconColor: theme.colors.textSubdued,
      };
  }
};

const getLeadingIconTile = (
  attachment: UnknownAttachment,
  iconType: IconType,
  theme: EuiThemeComputed
): { background: string; iconColor: string } => {
  if (attachment.type === NIGHTSHIFT_SIGNIFICANT_EVENT_TYPE) {
    const data = attachment.data as { severity?: string };
    return getNightshiftLeadingIconTile(data.severity, theme);
  }

  return {
    background: theme.colors.backgroundBasePrimary,
    iconColor: theme.colors.primary,
  };
};

export interface RoundUserAttachmentItemProps {
  attachment: UnknownAttachment;
  version: number;
}

/**
 * Compact attachment row for user-message attachment lists. Icon, single-line
 * title, and expand-only action — separate from {@link InlineAttachmentWithActions}
 * used under agent responses.
 */
export const RoundUserAttachmentItem: React.FC<RoundUserAttachmentItemProps> = ({
  attachment,
  version,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachmentsService } = useAgentBuilderServices();
  const { openCanvas } = useCanvasContext();

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type;
  const iconType = uiDefinition?.getIcon?.() ?? 'document';
  const iconTile = useMemo(
    () => getLeadingIconTile(attachment, iconType, euiTheme),
    [attachment, iconType, euiTheme]
  );

  const onExpand = useCallback(() => {
    openCanvas(attachment, false, version);
  }, [attachment, openCanvas, version]);

  if (!uiDefinition) {
    return null;
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="none"
      color="plain"
      data-test-subj={`agentBuilderRoundUserAttachment-${attachment.id}`}
      css={css`
        width: 100%;
        max-height: 100%;
        padding: ${USER_ATTACHMENT_PADDING_PX}px;
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <div
            aria-hidden
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${euiTheme.size.xl};
              height: ${euiTheme.size.xl};
              flex-shrink: 0;
              border-radius: ${euiTheme.border.radius.small};
              background: ${iconTile.background};
            `}
          >
            <EuiIcon type={iconType} size="m" color={iconTile.iconColor} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow style={{ minWidth: 0 }}>
          <EuiText
            size="s"
            css={css`
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            `}
          >
            {title}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="expand"
            color="text"
            size="s"
            aria-label={expandAriaLabel}
            data-test-subj={`agentBuilderRoundUserAttachmentExpand-${attachment.id}`}
            onClick={onExpand}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
