/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import type { StreamFlyoutProps } from '.';
import {
  StreamDetailEnrichmentContentImpl,
  StreamDetailEnrichmentContentProvider,
  StreamDetailEnrichmentFooter,
} from '../stream_management/data_management/stream_detail_pipeline_processing/page_content';
import { loadProcessing } from '../stream_management/data_management/stream_detail_pipeline_processing/processing_persistence_adapter';

export function StreamProcessing({ name }: StreamFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value, loading, error, refresh } = useStreamsAppFetch(
    ({ signal }) =>
      loadProcessing({
        core,
        streamsRepositoryClient,
        destinationNodeName: name,
        signal,
      }),
    [core, name, streamsRepositoryClient]
  );

  if (loading && !value) {
    return (
      <EuiFlyoutBody>
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner size="xl" data-test-subj="streamsFlyoutProcessingLoading" />
        </EuiFlexGroup>
      </EuiFlyoutBody>
    );
  }

  if (error || !value) {
    return (
      <EuiFlyoutBody>
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={i18n.translate('xpack.streams.flyout.processing.loadErrorTitle', {
            defaultMessage: 'Could not load processing',
          })}
        >
          <p>{error?.message}</p>
        </EuiCallOut>
      </EuiFlyoutBody>
    );
  }

  return (
    <StreamDetailEnrichmentContentProvider
      definition={value.definition}
      pipeline={value.pipeline}
      processingPersistenceAdapter={value.processingPersistenceAdapter}
      refreshDefinition={refresh}
    >
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            box-sizing: border-box;
            height: 100%;
            padding: ${euiTheme.size.l};
          }

          .euiFlyoutBody__overflowContent > div {
            height: 100%;
          }
        `}
      >
        <StreamDetailEnrichmentContentImpl />
      </EuiFlyoutBody>
      <StreamDetailEnrichmentFooter />
    </StreamDetailEnrichmentContentProvider>
  );
}
