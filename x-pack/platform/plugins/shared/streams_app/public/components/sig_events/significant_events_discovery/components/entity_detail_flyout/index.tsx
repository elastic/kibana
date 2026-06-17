/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
  EuiSpacer,
  EuiAccordion,
  EuiText,
  EuiLoadingSpinner,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DiscussWithAgentButton, formatEntityDetailChatMessage } from '../sig_event_agent_chat';

interface DescriptionItem {
  title: string;
  description: NonNullable<React.ReactNode>;
}

interface HistoryEntry {
  timestamp: string;
  summary: string;
}

interface EntityDetailFlyoutProps {
  title: string;
  entityId: string;
  details: DescriptionItem[];
  history: HistoryEntry[];
  isHistoryLoading: boolean;
  onClose: () => void;
}

export const EntityDetailFlyout = ({
  title,
  entityId,
  details,
  history,
  isHistoryLoading,
  onClose,
}: EntityDetailFlyoutProps) => {
  const titleId = useGeneratedHtmlId();
  const historyAccordionId = useGeneratedHtmlId({ prefix: 'entity-history' });

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {entityId}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList type="column" columnWidths={[1, 2]} listItems={details} compressed />
        <EuiSpacer size="l" />
        <EuiAccordion
          id={historyAccordionId}
          buttonContent={i18n.translate('xpack.streams.entityDetailFlyout.historyAccordionLabel', {
            defaultMessage: 'History',
          })}
          initialIsOpen
        >
          <EuiSpacer size="s" />
          {isHistoryLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : history.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.entityDetailFlyout.noHistory', {
                defaultMessage: 'No history available.',
              })}
            </EuiText>
          ) : (
            <EuiFlexGroup direction="column" gutterSize="s">
              {history.map((entry, idx) => (
                <EuiFlexItem key={`${entry.timestamp}-${idx}`}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{entry.timestamp}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">{entry.summary}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </EuiAccordion>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <DiscussWithAgentButton
              initialMessage={formatEntityDetailChatMessage({ title, entityId, details })}
              dataTestSubj="streamsEntityDetailFlyoutDiscussWithAgentButton"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
