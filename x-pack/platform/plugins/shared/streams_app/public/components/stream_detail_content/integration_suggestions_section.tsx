/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IntegrationSuggestion } from '../../hooks/use_integration_suggestions_fetch';

interface IntegrationSuggestionsSectionProps {
  suggestions: IntegrationSuggestion[];
  loading: boolean;
  streamName: string;
}

export function IntegrationSuggestionsSection({
  suggestions,
  loading,
  streamName,
}: IntegrationSuggestionsSectionProps) {
  if (loading) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<span />} />
      </EuiPanel>
    );
  }

  if (suggestions.length === 0) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiEmptyPrompt
          iconType="package"
          title={<h3>{NO_SUGGESTIONS_TITLE}</h3>}
          body={<p>{NO_SUGGESTIONS_DESCRIPTION}</p>}
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiText size="s" color="subdued">
        {SUGGESTIONS_DESCRIPTION}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {suggestions.map((suggestion) => (
          <EuiFlexItem key={suggestion.packageName}>
            <IntegrationSuggestionCard suggestion={suggestion} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

interface IntegrationSuggestionCardProps {
  suggestion: IntegrationSuggestion;
}

function IntegrationSuggestionCard({ suggestion }: IntegrationSuggestionCardProps) {
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const accordionId = useGeneratedHtmlId({ prefix: 'otelConfig', suffix: suggestion.packageName });

  const confidenceColor = getConfidenceColor(suggestion.confidence);

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`streamsAppIntegrationSuggestion-${suggestion.packageName}`}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {/* Header row: Package name, confidence, and docs link */}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="package" size="l" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h4>{suggestion.packageTitle}</h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.streams.content.integrationSuggestions.detectedFrom', {
                      defaultMessage: 'Detected from: {featureTitle}',
                      values: { featureTitle: suggestion.featureTitle },
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={CONFIDENCE_TOOLTIP}>
                <EuiBadge color={confidenceColor}>
                  {i18n.translate('xpack.streams.content.integrationSuggestions.confidenceBadge', {
                    defaultMessage: '{confidence}% confidence',
                    values: { confidence: suggestion.confidence },
                  })}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
            {suggestion.docsUrl && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={LEARN_MORE_TOOLTIP}>
                  <EuiButtonIcon
                    href={suggestion.docsUrl}
                    target="_blank"
                    iconType="documentation"
                    aria-label={LEARN_MORE_ARIA}
                    data-test-subj="streamsAppIntegrationDocsLink"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Benefits list */}
        {suggestion.benefits.length > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {suggestion.benefits.map((benefit, index) => (
                <EuiFlexItem grow={false} key={index}>
                  <EuiBadge color="hollow">{benefit}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        {/* OTel config section */}
        {suggestion.otelConfig && (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiAccordion
              id={accordionId}
              buttonContent={
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{OTEL_CONFIG_TITLE}</strong>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              forceState={isConfigExpanded ? 'open' : 'closed'}
              onToggle={(isOpen) => setIsConfigExpanded(isOpen)}
              paddingSize="s"
              extraAction={
                <EuiCopy textToCopy={suggestion.otelConfig}>
                  {(copy) => (
                    <EuiButtonEmpty
                      size="xs"
                      iconType="copy"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        copy();
                      }}
                      data-test-subj="streamsAppIntegrationCopyConfig"
                    >
                      {COPY_CONFIG_BUTTON}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              }
            >
              <EuiCodeBlock
                language="yaml"
                fontSize="s"
                paddingSize="m"
                isCopyable
                overflowHeight={300}
                css={css`
                  max-width: 100%;
                `}
              >
                {suggestion.otelConfig}
              </EuiCodeBlock>
            </EuiAccordion>
          </EuiFlexItem>
        )}

        {/* No OTel config message */}
        {!suggestion.otelConfig && (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <EuiIcon type="iInCircle" size="s" /> {NO_OTEL_CONFIG_MESSAGE}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function getConfidenceColor(confidence: number): 'success' | 'warning' | 'hollow' {
  if (confidence >= 90) return 'success';
  if (confidence >= 80) return 'warning';
  return 'hollow';
}

// i18n labels

const NO_SUGGESTIONS_TITLE = i18n.translate(
  'xpack.streams.content.integrationSuggestions.empty.title',
  {
    defaultMessage: 'No integration suggestions',
  }
);

const NO_SUGGESTIONS_DESCRIPTION = i18n.translate(
  'xpack.streams.content.integrationSuggestions.empty.description',
  {
    defaultMessage:
      'Integration suggestions appear when feature detection identifies technologies (like databases or web servers) in your logs with high confidence. Run feature detection to discover integrations that can provide dashboards and metrics.',
  }
);

const SUGGESTIONS_DESCRIPTION = i18n.translate(
  'xpack.streams.content.integrationSuggestions.description',
  {
    defaultMessage:
      'These integrations were suggested based on technologies detected in your stream data. Install them to get dashboards, metrics, and enhanced monitoring.',
  }
);

const CONFIDENCE_TOOLTIP = i18n.translate(
  'xpack.streams.content.integrationSuggestions.confidenceTooltip',
  {
    defaultMessage:
      'Confidence score from feature detection. Higher values indicate stronger evidence.',
  }
);

const LEARN_MORE_TOOLTIP = i18n.translate(
  'xpack.streams.content.integrationSuggestions.learnMoreTooltip',
  {
    defaultMessage: 'View integration documentation',
  }
);

const LEARN_MORE_ARIA = i18n.translate(
  'xpack.streams.content.integrationSuggestions.learnMoreAria',
  {
    defaultMessage: 'View integration documentation',
  }
);

const OTEL_CONFIG_TITLE = i18n.translate(
  'xpack.streams.content.integrationSuggestions.otelConfigTitle',
  {
    defaultMessage: 'OpenTelemetry Collector Config',
  }
);

const COPY_CONFIG_BUTTON = i18n.translate(
  'xpack.streams.content.integrationSuggestions.copyConfigButton',
  {
    defaultMessage: 'Copy config',
  }
);

const NO_OTEL_CONFIG_MESSAGE = i18n.translate(
  'xpack.streams.content.integrationSuggestions.noOtelConfig',
  {
    defaultMessage:
      'OpenTelemetry config not available. Install the integration via Fleet to configure data collection.',
  }
);
