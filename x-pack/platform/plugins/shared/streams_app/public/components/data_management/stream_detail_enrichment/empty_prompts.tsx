/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { AssetImage } from '../../asset_image';
import { ProcessingPanel } from './pipeline_suggestions/processing_panel';
import {
  useInteractiveModeSelector,
  useStreamEnrichmentEvents,
} from './state_management/stream_enrichment_state_machine';

const ProcessingButtonsManual = ({ center = false }: { center?: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const { addProcessor, addCondition } = useStreamEnrichmentEvents();

  const canAddStep = useInteractiveModeSelector(
    (state) => state.can({ type: 'step.addProcessor' }) || state.can({ type: 'step.addCondition' })
  );

  return (
    <EuiFlexGroup gutterSize="s" justifyContent={center ? 'center' : 'flexStart'}>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          fill={false}
          css={css`
            color: ${euiTheme.colors.textPrimary};
          `}
          data-test-subj="streamsAppStreamDetailEnrichmentCreateConditionButton"
          iconType="logstashIf"
          disabled={!canAddStep}
          onClick={() => addCondition(undefined, { parentId: null })}
        >
          {createConditionText}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          fill={false}
          css={css`
            color: ${euiTheme.colors.textPrimary};
          `}
          data-test-subj="streamsAppStreamDetailEnrichmentCreateProcessorButton"
          iconType="compute"
          disabled={!canAddStep}
          onClick={() => addProcessor(undefined, { parentId: null })}
        >
          {createProcessorText}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface NoStepsEmptyPromptProps {
  canUsePipelineSuggestions: boolean;
  children?: React.ReactNode;
}

export const RootStreamEmptyPrompt = () => {
  const router = useStreamsAppRouter();
  const {
    path: { key: streamName },
  } = useStreamsAppParams('/{key}/management/{tab}');

  return (
    <EuiEmptyPrompt
      aria-live="polite"
      titleSize="xs"
      icon={<AssetImage type="processorsCannotBeAddedToRootStreams" />}
      title={
        <h2>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.title',
            { defaultMessage: 'Processors cannot be added to root streams' }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.body',
            {
              defaultMessage:
                'To transform your data with processors, partition a new child stream.',
            }
          )}
        </p>
      }
      actions={
        <EuiButton
          href={router.link('/{key}/management/{tab}', {
            path: {
              key: streamName,
              tab: 'partitioning',
            },
          })}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.button',
            {
              defaultMessage: 'Open stream partitioning',
            }
          )}
        </EuiButton>
      }
    />
  );
};

export const NoStepsEmptyPrompt = ({
  canUsePipelineSuggestions,
  children,
}: NoStepsEmptyPromptProps) => {
  const message = canUsePipelineSuggestions ? cardDescriptionAiEnabled : cardDescriptionManual;

  return (
    <EuiEmptyPrompt
      aria-live="polite"
      css={css`
        margin-top: unset;
      `}
      body={
        <EuiFlexGroup direction="column" justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem>
            <ProcessingPanel message={message}>
              {canUsePipelineSuggestions ? children : <ProcessingButtonsManual />}
            </ProcessingPanel>
          </EuiFlexItem>
          {canUsePipelineSuggestions && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="m">
                  <EuiFlexItem>
                    <EuiHorizontalRule margin="none" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      {i18n.translate(
                        'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.or',
                        {
                          defaultMessage: 'or',
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiHorizontalRule margin="none" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiFlexItem>
                <ProcessingButtonsManual center={true} />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      }
    />
  );
};

export const NoPreviewDocumentsEmptyPrompt = () => {
  return (
    <EuiEmptyPrompt
      aria-live="polite"
      icon={<AssetImage type="noResults" />}
      titleSize="s"
      title={
        <h2>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noFilteredDocumentsTitle',
            { defaultMessage: 'No documents available' }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noFilteredDocumentsBody',
            {
              defaultMessage: 'The current filter settings do not match any documents.',
            }
          )}
        </p>
      }
    />
  );
};

export const NoProcessingDataAvailableEmptyPrompt = () => {
  return (
    <EuiEmptyPrompt
      aria-live="polite"
      color="warning"
      iconType="warning"
      titleSize="s"
      title={
        <h2>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noDataTitle',
            { defaultMessage: 'No data available to validate processor changes' }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noDataBody',
            {
              defaultMessage:
                'Changes will be applied, but we can’t confirm they’ll work as expected. Proceed with caution.',
            }
          )}
        </p>
      }
    />
  );
};

const cardDescriptionAiEnabled = i18n.translate(
  'xpack.streams.streamDetailView.processingTab.noDataEmptyPrompt.cardDescription',
  {
    defaultMessage:
      'Transform your data before indexing with conditions and processors. Do it yourself, or let Elastic suggest an AI-generated proposal based on your data.',
  }
);

const cardDescriptionManual = i18n.translate(
  'xpack.streams.streamDetailView.processingTab.noDataEmptyPrompt.cardDescriptionManual',
  {
    defaultMessage: 'Transform your data before indexing with conditions and processors.',
  }
);

const createConditionText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createConditionButtonText',
  {
    defaultMessage: 'Create condition',
  }
);

const createProcessorText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createProcessorButtonText',
  {
    defaultMessage: 'Create processor',
  }
);
