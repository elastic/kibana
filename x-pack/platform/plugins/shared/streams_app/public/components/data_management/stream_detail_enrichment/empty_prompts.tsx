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
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { AssetImage } from '../../asset_image';
import { CreateStepButton } from './create_step_button';

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

export const NoStepsEmptyPrompt = () => {
  return (
    <EuiEmptyPrompt
      aria-live="polite"
      titleSize="xs"
      icon={<AssetImage type="extractFields" />}
      title={
        <h2>
          {i18n.translate('xpack.streams.streamDetailView.managementTab.noStepsEmptyPrompt.title', {
            defaultMessage: 'Transform your data before indexing by:',
          })}
        </h2>
      }
      body={
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.noStepsEmptyPrompt.body',
                {
                  defaultMessage: 'Create conditions to focus on specific data in your stream.',
                }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.noStepsEmptyPrompt.body',
                {
                  defaultMessage:
                    'Create processors to extract meaningful fields so you can filter and analyze your data effectively.',
                }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiFlexItem>
            <CreateStepButton mode="prominent" />
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
