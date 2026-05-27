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
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AttachmentGroup } from '@kbn/agent-builder-common/attachments';

const removeAriaLabel = i18n.translate('xpack.agentBuilder.attachmentGroupPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment group',
});

const DEFAULT_ICON = 'layers';

export interface AttachmentGroupPillProps {
  group: AttachmentGroup;
  onRemove?: () => void;
}

export const AttachmentGroupPill: React.FC<AttachmentGroupPillProps> = ({ group, onRemove }) => {
  const { euiTheme } = useEuiTheme();

  const removeButtonClass = css`
    opacity: 0;
    transition: opacity ${euiTheme.animation.fast};
  `;

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

  const panelStyles = css`
    max-width: 200px;
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.darkShade};
    &:hover .${removeButtonClass}, &:focus-within .${removeButtonClass} {
      opacity: 1;
    }
  `;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      paddingSize="s"
      css={panelStyles}
      data-test-subj={`agentBuilderAttachmentGroupPill-${group.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <div className={iconContainerStyles}>
            <EuiIcon type={DEFAULT_ICON} size="m" color="primary" aria-hidden={true} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiText size="xs" className={titleStyles}>
            <strong>{group.label}</strong>
          </EuiText>
        </EuiFlexItem>
        {onRemove && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={removeAriaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                className={removeButtonClass}
                iconType="cross"
                size="xs"
                color="text"
                aria-label={removeAriaLabel}
                onClick={onRemove}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
