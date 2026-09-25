/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useStreamsAppParams } from '../../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { AssetImage } from '../../../asset_image';
import { useAddStepActions } from './hooks/use_add_step_actions';
import { useOptionalInteractiveModeSelector } from './state_management/stream_enrichment_state_machine';

const ManualStepButtons = () => {
  const { onAddCondition, onAddProcessor } = useAddStepActions();

  const canAddStep = useOptionalInteractiveModeSelector(
    (state) => state.can({ type: 'step.addProcessor' }) || state.can({ type: 'step.addCondition' }),
    false
  );

  if (!canAddStep) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          data-test-subj="streamsAppStreamDetailEnrichmentCreateConditionButton"
          onClick={onAddCondition}
        >
          {addConditionText}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          data-test-subj="streamsAppStreamDetailEnrichmentCreateProcessorButton"
          onClick={onAddProcessor}
        >
          {addProcessorText}
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
  const { euiTheme } = useEuiTheme();

  return (
    <EuiEmptyPrompt
      aria-live="polite"
      titleSize="xxs"
      css={css`
        margin: 0 auto;
        max-width: 400px;
      `}
      icon={
        <EuiAvatar
          name=""
          aria-hidden
          type="space"
          size="l"
          iconSize="m"
          iconType="processor"
          color={euiTheme.colors.backgroundBaseSubdued}
          css={css`
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
          `}
        />
      }
      title={<h2>{noStepsTitle}</h2>}
      body={<p>{noStepsDescription}</p>}
      actions={
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="m" responsive={false}>
          {canUsePipelineSuggestions && (
            <>
              <EuiFlexItem grow={false}>{children}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {orManuallyText}
                </EuiText>
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem grow={false}>
            <ManualStepButtons />
          </EuiFlexItem>
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
      data-test-subj="streamsAppProcessingPreviewEmptyPrompt"
      icon={<AssetImage size="small" type="noDocuments" />}
      titleSize="xxs"
      title={
        <h2 data-test-subj="streamsAppProcessingPreviewEmptyPromptTitle">
          {i18n.translate('xpack.streams.streamDetail.preview.empty', {
            defaultMessage: 'No documents found',
          })}
        </h2>
      }
      body={
        <EuiText size="s" data-test-subj="streamsAppProcessingPreviewEmptyPromptBody">
          {i18n.translate('xpack.streams.streamDetail.preview.emptyBody', {
            defaultMessage:
              "Try a different time range or data sample. Changes can still be applied, but we can't confirm they'll work as expected.",
          })}
        </EuiText>
      }
    />
  );
};

const noStepsTitle = i18n.translate(
  'xpack.streams.streamDetailView.processingTab.noStepsEmptyPrompt.title',
  {
    defaultMessage: 'Structure your data',
  }
);

const noStepsDescription = i18n.translate(
  'xpack.streams.streamDetailView.processingTab.noStepsEmptyPrompt.description',
  {
    defaultMessage:
      'Add processors to parse and transform your data and extract fields you can use in Discover and dashboards.',
  }
);

const orManuallyText = i18n.translate(
  'xpack.streams.streamDetailView.processingTab.noStepsEmptyPrompt.orManually',
  {
    defaultMessage: 'Or manually...',
  }
);

const addConditionText = i18n.translate(
  'xpack.streams.streamDetailView.processingTab.noStepsEmptyPrompt.addConditionButtonText',
  {
    defaultMessage: 'Add condition',
  }
);

const addProcessorText = i18n.translate(
  'xpack.streams.streamDetailView.processingTab.noStepsEmptyPrompt.addProcessorButtonText',
  {
    defaultMessage: 'Add processor',
  }
);
