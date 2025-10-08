/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AssetImage } from '../../asset_image';
import { CreateStepButton } from './create_step_button';

export const RootStreamEmptyPrompt = () => {
  return (
    <EuiEmptyPrompt
      aria-live="polite"
      titleSize="xs"
      icon={<AssetImage type="processorsCannotBeAddedToRootStreams" />}
      title={
        <h2>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.title',
            { defaultMessage: 'Processing data is not allowed for root streams.' }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.body',
            {
              defaultMessage:
                'Root streams are selectively immutable and cannot be enriched with processors. To enrich data, reroute a new child stream and add processors to it.',
            }
          )}
        </p>
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
            defaultMessage: 'Extract useful fields from your data',
          })}
        </h2>
      }
      body={
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <p>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.noStepsEmptyPrompt.body',
                {
                  defaultMessage:
                    'Transform your data before indexing with conditions and processors.',
                }
              )}
            </p>
          </EuiFlexItem>
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
