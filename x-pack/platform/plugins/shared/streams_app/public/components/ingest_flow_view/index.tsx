/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSwitch,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { FlowCanvas } from './flow_canvas';
import { SimulatedSourcesBanner } from './simulated_sources_banner';
import { Legend } from './legend';
import { useFlowThroughputPoll } from './hooks/use_flow_throughput_poll';
import { DetailFlyout } from './panels/detail_flyout';

export function IngestFlowView() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [isPaused, setIsPaused] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const flowGraphFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_flow/graph', {
        signal,
      }),
    [streamsRepositoryClient]
  );

  const throughputData = useFlowThroughputPoll(5000, isPaused);

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem>
              {i18n.translate('xpack.streams.ingestFlow.pageHeaderTitle', {
                defaultMessage: 'Ingest flow (POC)',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate('xpack.streams.ingestFlow.pauseLiveUpdatesLabel', {
                  defaultMessage: 'Pause live updates',
                })}
                checked={isPaused}
                onChange={(e) => setIsPaused(e.target.checked)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        bottomBorder="extended"
      />
      <StreamsAppPageTemplate.Body grow>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          css={css`
            height: 100%;
          `}
        >
          <EuiFlexItem grow={false}>
            <SimulatedSourcesBanner />
          </EuiFlexItem>

          {selectedNodeId && flowGraphFetch.value && (
            <DetailFlyout
              node={flowGraphFetch.value.nodes.find((n) => n.id === selectedNodeId) ?? null}
              onClose={() => setSelectedNodeId(null)}
            />
          )}

          <EuiFlexItem grow>
            {flowGraphFetch.loading && flowGraphFetch.value === undefined ? (
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                css={css`
                  min-height: 200px;
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="xl" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : flowGraphFetch.error ? (
              <EuiEmptyPrompt
                color="danger"
                iconType="error"
                title={
                  <h2>
                    {i18n.translate('xpack.streams.ingestFlow.errorTitle', {
                      defaultMessage: 'Failed to load ingest flow',
                    })}
                  </h2>
                }
                body={<p>{String(flowGraphFetch.error)}</p>}
              />
            ) : flowGraphFetch.value ? (
              <FlowCanvas
                payload={flowGraphFetch.value}
                throughput={throughputData}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            ) : null}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <Legend />
          </EuiFlexItem>
        </EuiFlexGroup>
      </StreamsAppPageTemplate.Body>
    </>
  );
}
