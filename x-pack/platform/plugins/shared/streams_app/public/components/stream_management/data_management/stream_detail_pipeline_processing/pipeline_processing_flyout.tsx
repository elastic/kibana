/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { getProcessingPipelineName } from './ingest_pipeline_processors';
import {
  StreamDetailEnrichmentContentImpl,
  StreamDetailEnrichmentContentProvider,
  StreamDetailEnrichmentFooter,
} from './page_content';
import { loadProcessing } from './processing_persistence_adapter';

interface PipelineProcessingFlyoutProps {
  destinationNodeName: string;
  onClose: () => void;
}

export function PipelineProcessingFlyout({
  destinationNodeName,
  onClose,
}: PipelineProcessingFlyoutProps) {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const pipelineName = getProcessingPipelineName(destinationNodeName);

  const { value, loading, error, refresh } = useStreamsAppFetch(
    ({ signal }) =>
      loadProcessing({
        core,
        streamsRepositoryClient,
        destinationNodeName,
        signal,
      }),
    [core, destinationNodeName, streamsRepositoryClient]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      size="l"
      data-test-subj="streamsPipelineProcessingFlyout"
      aria-labelledby="streamsPipelineProcessingFlyoutTitle"
      ownFocus
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="streamsPipelineProcessingFlyoutTitle">
            {i18n.translate('xpack.streams.pipelineProcessing.flyoutTitle', {
              defaultMessage: 'Edit processing pipeline',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{pipelineName}</p>
        </EuiText>
      </EuiFlyoutHeader>
      {loading && !value ? (
        <EuiFlyoutBody>
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiLoadingSpinner size="xl" data-test-subj="streamsPipelineProcessingLoading" />
          </EuiFlexGroup>
        </EuiFlyoutBody>
      ) : error || !value ? (
        <EuiFlyoutBody>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.streams.pipelineProcessing.loadErrorTitle', {
              defaultMessage: 'Could not load processing pipeline',
            })}
          >
            <p>{error?.message}</p>
          </EuiCallOut>
        </EuiFlyoutBody>
      ) : (
        <StreamDetailEnrichmentContentProvider
          definition={value.definition}
          pipeline={value.pipeline}
          processingPersistenceAdapter={value.processingPersistenceAdapter}
          refreshDefinition={refresh}
        >
          <EuiFlyoutBody
            css={css`
              .euiFlyoutBody__overflowContent,
              .euiFlyoutBody__overflowContent > div {
                height: 100%;
              }
            `}
          >
            <StreamDetailEnrichmentContentImpl />
          </EuiFlyoutBody>
          <StreamDetailEnrichmentFooter />
        </StreamDetailEnrichmentContentProvider>
      )}
    </EuiFlyout>
  );
}
