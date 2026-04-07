/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { EmbeddableConversationInternal } from '../../../embeddable/embeddable_conversation';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';

interface WorkspacePaneProps {
  paneId: string;
  canSplit: boolean;
  canClose: boolean;
  onSplit: () => void;
  onClose: () => void;
  onForkPane?: (forkedConversationId: string) => void;
  onSpawnPane?: (options: {
    initialMessage?: string;
    forkedConversationId?: string;
    title?: string;
  }) => void;
  /** Sibling pane conversation IDs and summaries for cross-pane ask_conversation awareness */
  siblingConversations?: Array<{
    paneId: string;
    conversationId: string;
    title?: string;
    summary?: string;
  }>;
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
  connectorId?: string;
}

const TOOLBAR_HEIGHT = 36;

export const WorkspacePane: React.FC<WorkspacePaneProps> = ({
  paneId,
  canSplit,
  canClose,
  onSplit,
  onClose,
  onForkPane,
  onSpawnPane,
  initialMessage,
  autoSendInitialMessage,
  connectorId,
  siblingConversations,
}) => {
  const { euiTheme } = useEuiTheme();
  const services = useAgentBuilderServices();
  const { services: coreStart } = useKibana<CoreStart>();
  const headingId = useId();

  const containerStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    border-right: 1px solid ${euiTheme.colors.borderBasePlain};
    &:last-of-type {
      border-right: none;
    }
  `;

  const toolbarStyles = css`
    height: ${TOOLBAR_HEIGHT}px;
    min-height: ${TOOLBAR_HEIGHT}px;
    padding: 0 ${euiTheme.size.s};
    border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    flex-shrink: 0;
    flex-grow: 0;
  `;

  const conversationStyles = css`
    flex: 1;
    min-height: 0;
    overflow: hidden;
    /* Each pane scrolls independently — override the embeddable's overflow: hidden */
    .euiFlyoutBody__overflow {
      overflow-y: auto !important;
    }
    .euiFlyoutHeader {
      padding: ${euiTheme.size.s} ${euiTheme.size.m};
      min-block-size: unset;
      /* Hide the menu button (first child) and right actions (last child) */
      > div > *:first-child,
      > div > *:last-child {
        display: none;
      }
      /* Show only the title column */
      > div {
        display: block;
      }
    }
  `;

  return (
    <div css={containerStyles}>
      <EuiFlexGroup
        css={toolbarStyles}
        alignItems="center"
        justifyContent="flexEnd"
        gutterSize="xs"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.agentBuilder.workspace.splitPaneTooltip', {
              defaultMessage: 'Split pane',
            })}
          >
            <EuiButtonIcon
              iconType="continuityAboveBelow"
              size="xs"
              color="text"
              isDisabled={!canSplit}
              onClick={onSplit}
              aria-label={i18n.translate('xpack.agentBuilder.workspace.splitPaneAriaLabel', {
                defaultMessage: 'Split pane',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.agentBuilder.workspace.closePaneTooltip', {
              defaultMessage: 'Close pane',
            })}
          >
            <EuiButtonIcon
              iconType="cross"
              size="xs"
              color="text"
              isDisabled={!canClose}
              onClick={onClose}
              aria-label={i18n.translate('xpack.agentBuilder.workspace.closePaneAriaLabel', {
                defaultMessage: 'Close pane',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div css={conversationStyles}>
        <EmbeddableConversationInternal
          coreStart={coreStart as unknown as CoreStart}
          services={services}
          sessionTag={`split-pane-${paneId}`}
          newConversation={false}
          initialMessage={initialMessage}
          autoSendInitialMessage={autoSendInitialMessage}
          connectorId={connectorId}
          onClose={() => {}}
          ariaLabelledBy={headingId}
          onFork={onForkPane}
          onRoundComplete={(conversationId) => {
            // Fire-and-forget: update the summary artifact for this pane
            services.conversationsService
              .summarize({ conversationId })
              .then(({ summary }) => {
                try {
                  localStorage.setItem(
                    `agentBuilder.workspace.pane.${paneId}.summary`,
                    JSON.stringify(summary)
                  );
                } catch {
                  // ignore storage errors
                }
              })
              .catch(() => {});
          }}
        />
      </div>
    </div>
  );
};
