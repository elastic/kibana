/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ConversationAttachmentDisplayModel } from './conversation_attachment_display_utils';

const labels = {
  persistent: i18n.translate('xpack.agentBuilder.conversationDetail.attachments.persistent', {
    defaultMessage: 'persistent',
  }),
};

interface ConversationAttachmentListItemProps {
  model: ConversationAttachmentDisplayModel;
}

export const ConversationAttachmentListItem: React.FC<ConversationAttachmentListItemProps> = ({
  model,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachment, title, subtitle, typeBadge, addedAt, isPersistent, iconType, sourceLink } =
    model;

  const iconContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xxl};
    height: ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${euiTheme.colors.lightestShade};
    flex-shrink: 0;
  `;

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;

  const subtitleStyles = css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `;

  const statusStyles = css`
    color: ${euiTheme.colors.successText};
    font-size: ${euiTheme.font.scale.xs}${euiTheme.font.defaultUnits};
    white-space: nowrap;
  `;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj={`conversationAttachmentListItem-${attachment.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <div className={iconContainerStyles}>
            <EuiIcon type={iconType} size="m" color="subdued" aria-hidden={true} />
          </div>
        </EuiFlexItem>

        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <EuiFlexGroup direction="column" gutterSize="xxs" responsive={false}>
            <EuiFlexItem grow={false}>
              {sourceLink ? (
                <EuiText size="s">
                  <EuiLink
                    href={sourceLink.href}
                    target={sourceLink.openInNewTab ? '_blank' : undefined}
                    rel={sourceLink.openInNewTab ? 'noopener noreferrer' : undefined}
                    css={titleStyles}
                    data-test-subj={`conversationAttachmentListItemLink-${attachment.id}`}
                  >
                    {title}
                  </EuiLink>
                </EuiText>
              ) : (
                <EuiText size="s" css={titleStyles}>
                  {title}
                </EuiText>
              )}
            </EuiFlexItem>
            {subtitle && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" css={subtitleStyles}>
                  {subtitle}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="m"
            responsive={false}
            wrap={false}
            css={css`
              flex-shrink: 0;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{typeBadge}</EuiBadge>
            </EuiFlexItem>
            {isPersistent && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <span
                      css={css`
                        width: 6px;
                        height: 6px;
                        border-radius: 50%;
                        background-color: ${euiTheme.colors.success};
                        display: inline-block;
                      `}
                      aria-hidden={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <span css={statusStyles}>{labels.persistent}</span>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {addedAt && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedRelative value={addedAt} />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
