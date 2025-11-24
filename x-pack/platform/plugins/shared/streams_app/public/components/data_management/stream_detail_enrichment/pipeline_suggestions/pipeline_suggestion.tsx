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
  EuiSpacer,
  EuiPanel,
  EuiTextTruncate,
  euiTextTruncate,
  EuiText,
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  StreamlangDSL,
  StreamlangProcessorDefinition,
  StreamlangProcessorDefinitionWithUIAttributes,
} from '@kbn/streamlang';
import { isActionBlock } from '@kbn/streamlang';
import { css } from '@emotion/react';
import { getStepDescription } from '../steps/blocks/action/utils';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import { GenerateSuggestionButton } from '../../stream_detail_routing/review_suggestions_form/generate_suggestions_button';
import { useSimulatorSelector } from '../state_management/stream_enrichment_state_machine';
import type {
  Simulation,
  ProcessorMetrics,
} from '../state_management/simulation_state_machine/types';

export interface PipelineSuggestionProps {
  aiFeatures: AIFeatures;
  pipeline: StreamlangDSL;
  onAccept(): void;
  onDismiss(): void;
  onRegenerate(connectorId: string): void;
}

export function PipelineSuggestion({
  aiFeatures,
  pipeline,
  onAccept,
  onDismiss,
  onRegenerate,
}: PipelineSuggestionProps) {
  const simulation = useSimulatorSelector((state) => state.context.simulation);
  const isSimulating = useSimulatorSelector((state) => state.matches('runningSimulation'));

  return (
    <EuiCallOut
      iconType="sparkles"
      title={i18n.translate(
        'xpack.streams.processingSuggestion.euiCallOut.reviewProcessingSuggestionsLabel',
        { defaultMessage: 'Review processing suggestions' }
      )}
      color="primary"
      onDismiss={onDismiss}
    >
      <EuiText size="s">
        {i18n.translate('xpack.streams.processingSuggestion.previewEachSuggestionBeforeTextLabel', {
          defaultMessage:
            'Preview each suggestion before accepting, as they will change how your data is ingested. All suggestions are based on the same sample of 100 documents from the original stream.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      {pipeline.steps.map((step, i) =>
        isActionBlock(step) ? (
          <>
            <ActionBlock
              key={i}
              step={step}
              stepIndex={i}
              pipeline={pipeline}
              simulation={simulation}
              isSimulating={isSimulating}
            />
            <EuiSpacer size="s" />
          </>
        ) : null
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
        <EuiFlexItem>
          <GenerateSuggestionButton
            iconType="refresh"
            size="s"
            onClick={onRegenerate}
            aiFeatures={aiFeatures}
          >
            {i18n.translate(
              'xpack.streams.streamDetailRouting.childStreamList.regenerateSuggestedPartitions',
              {
                defaultMessage: 'Regenerate',
              }
            )}
          </GenerateSuggestionButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onDismiss} color="primary" size="s">
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.rejectButton',
              {
                defaultMessage: 'Reject',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="check" onClick={onAccept} color="primary" size="s" fill>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.acceptButton',
              {
                defaultMessage: 'Accept',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}

const ActionBlock = ({
  step,
  stepIndex,
  pipeline,
  simulation,
  isSimulating,
}: {
  step: StreamlangProcessorDefinition;
  stepIndex: number;
  pipeline: StreamlangDSL;
  simulation: Simulation | undefined;
  isSimulating: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const stepDescription = getStepDescription(step as StreamlangProcessorDefinitionWithUIAttributes);

  // Get processor metrics - since suggested steps don't have IDs yet, we match by index
  const processorKeys = simulation?.processors_metrics
    ? Object.keys(simulation.processors_metrics)
    : [];
  const processorMetrics: ProcessorMetrics | undefined =
    processorKeys[stepIndex] && simulation?.processors_metrics
      ? simulation.processors_metrics[processorKeys[stepIndex]]
      : undefined;

  const parsedRate = processorMetrics?.parsed_rate;
  const hasErrors = processorMetrics && processorMetrics.errors.length > 0;

  return (
    <EuiPanel
      hasShadow={false}
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.size.s};
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem
              grow={true}
              css={css`
                min-width: 0;
                margin-right: ${euiTheme.size.s};
              `}
            >
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiText
                  size="s"
                  style={{ fontWeight: euiTheme.font.weight.bold }}
                  css={css`
                    display: block;
                    ${euiTextTruncate()}
                  `}
                >
                  {step.action.toUpperCase()}
                </EuiText>
                {!isSimulating && processorMetrics && (
                  <>
                    {parsedRate !== undefined && parsedRate > 0 && (
                      <EuiText size="xs" color="success">
                        {i18n.translate('xpack.streams.processingSuggestion.stepParsedRate', {
                          defaultMessage: '{percentage}% success',
                          values: { percentage: (parsedRate * 100).toFixed(0) },
                        })}
                      </EuiText>
                    )}
                    {hasErrors && (
                      <EuiText size="xs" color="danger">
                        {i18n.translate('xpack.streams.processingSuggestion.stepHasErrors', {
                          defaultMessage: '{count} error{plural}',
                          values: {
                            count: processorMetrics.errors.length,
                            plural: processorMetrics.errors.length > 1 ? 's' : '',
                          },
                        })}
                      </EuiText>
                    )}
                  </>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel
            hasShadow={false}
            color="subdued"
            css={css`
              padding: ${euiTheme.size.xs} ${euiTheme.size.s};
            `}
          >
            <EuiTextTruncate
              text={stepDescription}
              truncation="end"
              children={() => (
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    font-family: ${euiTheme.font.familyCode};
                  `}
                >
                  {stepDescription}
                </EuiText>
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
