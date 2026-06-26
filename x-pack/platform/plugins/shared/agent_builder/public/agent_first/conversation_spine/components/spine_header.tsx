/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { headerHeight } from '../../../application/components/conversations/conversation.styles';
import { useConversationSpineContext } from '../conversation_spine_context';
import type { SpineHeaderSlots } from '../types';
import { SpineRelationshipBadge } from './spine_relationship_badge';

const labels = {
  close: i18n.translate('xpack.agentBuilder.conversationSpine.header.close', {
    defaultMessage: 'Close',
  }),
  fullscreen: i18n.translate('xpack.agentBuilder.conversationSpine.header.fullscreen', {
    defaultMessage: 'Toggle fullscreen',
  }),
};

interface SpineHeaderProps {
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  headerSlots?: SpineHeaderSlots;
}

export const SpineHeader: React.FC<SpineHeaderProps> = ({
  onClose,
  isFullscreen,
  onToggleFullscreen,
  headerSlots,
}) => {
  const { euiTheme } = useEuiTheme();
  const { spineState } = useConversationSpineContext();

  const headerShellStyles = css`
    flex-shrink: 0;
    box-sizing: border-box;
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    background: ${euiTheme.colors.backgroundBasePlain};
    padding-inline: ${euiTheme.size.m};
    min-height: calc(${headerHeight}px - ${euiTheme.border.width.thin});
  `;

  return (
    <div css={headerShellStyles}>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        style={{ minHeight: `calc(${headerHeight}px - ${euiTheme.border.width.thin})` }}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            {headerSlots?.beforeTitle ? (
              <EuiFlexItem grow={false}>{headerSlots.beforeTitle}</EuiFlexItem>
            ) : null}
            {spineState ? (
              <EuiFlexItem grow={false}>
                <SpineRelationshipBadge
                  type={spineState.record.type}
                  identifier={spineState.record.identifier}
                />
              </EuiFlexItem>
            ) : null}
            {headerSlots?.afterTitle ? (
              <EuiFlexItem grow={false}>{headerSlots.afterTitle}</EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.fullscreen} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
                  aria-label={labels.fullscreen}
                  color="text"
                  size="s"
                  onClick={onToggleFullscreen}
                  data-test-subj="agentBuilderConversationSpineFullscreen"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.close} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={labels.close}
                  color="text"
                  size="s"
                  onClick={onClose}
                  data-test-subj="agentBuilderConversationSpineClose"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
