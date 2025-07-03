/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  useGeneratedHtmlId,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { FormattedMessage } from '@kbn/i18n-react';
import { AIFeatures } from './use_ai_features';
import { useKibana } from '../../../../../hooks/use_kibana';

export interface GeneratePatternButtonProps {
  onClick(connectorId: string): void;
  isLoading?: boolean;
  isDisabled?: boolean;
  aiFeatures: AIFeatures;
}

export const GeneratePatternButton = ({
  aiFeatures,
  onClick,
  isLoading,
  isDisabled,
}: GeneratePatternButtonProps) => {
  const {
    core: { http },
  } = useKibana();
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  if (!aiFeatures.enabled) {
    if (aiFeatures.couldBeEnabled) {
      return (
        <EuiToolTip
          content={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.aiAssistantNotEnabledTooltip',
            {
              defaultMessage:
                'AI Assistant features are not enabled. To enable features, add an AI connector on the management page.',
            }
          )}
        >
          <EuiLink
            target="_blank"
            href={http.basePath.prepend(
              `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
            )}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.aiAssistantNotEnabled',
              { defaultMessage: 'Enable AI Assistant features' }
            )}
          </EuiLink>
        </EuiToolTip>
      );
    }
    return null;
  }

  return (
    <>
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="sparkles"
            data-test-subj="streamsAppGrokAiSuggestionsRefreshSuggestionsButton"
            onClick={() => onClick(aiFeatures.genAiConnectors.selectedConnector!)}
            isLoading={isLoading}
            isDisabled={!aiFeatures.genAiConnectors.selectedConnector || isDisabled}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestions',
              {
                defaultMessage: 'Generate pattern',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        {aiFeatures.genAiConnectors.connectors &&
          aiFeatures.genAiConnectors.connectors.length >= 2 && (
            <EuiFlexItem grow={false}>
              <EuiPopover
                id={splitButtonPopoverId}
                isOpen={isPopoverOpen}
                button={
                  <EuiButtonIcon
                    data-test-subj="streamsAppGrokAiPickConnectorButton"
                    onClick={togglePopover}
                    display="base"
                    size="s"
                    iconType="boxesVertical"
                    aria-label={i18n.translate(
                      'xpack.streams.refreshButton.euiButtonIcon.moreLabel',
                      {
                        defaultMessage: 'More',
                      }
                    )}
                  />
                }
                panelPaddingSize="none"
              >
                <EuiContextMenuPanel
                  size="s"
                  items={aiFeatures.genAiConnectors.connectors.map((connector) => (
                    <EuiContextMenuItem
                      key={connector.id}
                      icon={
                        connector.id === aiFeatures.genAiConnectors.selectedConnector
                          ? 'check'
                          : 'empty'
                      }
                      onClick={() => {
                        aiFeatures.genAiConnectors.selectConnector(connector.id);
                        closePopover();
                      }}
                    >
                      {connector.name}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiPopover>
            </EuiFlexItem>
          )}
      </EuiFlexGroup>
    </>
  );
};

export interface AdditionalChargesCalloutProps {
  aiFeatures: AIFeatures;
}

export const AdditionalChargesCallout = ({ aiFeatures }: AdditionalChargesCalloutProps) => {
  const {
    core: { docLinks },
  } = useKibana();

  return (
    <EuiCallOut onDismiss={() => aiFeatures.acknowledgeAdditionalCharges(true)}>
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.managedConnectorTooltip"
        defaultMessage="Elastic Managed LLM is the new default for generating patterns and incurs <costLink>additional charges</costLink>. Other LLM connectors remain available. <learnMoreLink>Learn more</learnMoreLink>"
        values={{
          costLink: (...chunks: React.ReactNode[]) => (
            <EuiLink
              href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
              target="_blank"
              rel="noopener noreferrer"
              external
            >
              {chunks}
            </EuiLink>
          ),
          learnMoreLink: (...chunks: React.ReactNode[]) => (
            <EuiLink
              href={docLinks?.links?.observability?.elasticManagedLlm}
              target="_blank"
              rel="noopener noreferrer"
              external
            >
              {chunks}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
