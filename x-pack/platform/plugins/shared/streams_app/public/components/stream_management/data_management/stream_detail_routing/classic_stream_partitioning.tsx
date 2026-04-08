/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiResizableContainer } from '@elastic/eui';
import { css } from '@emotion/css';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { ChildStreamList } from './child_stream_list';
import { PreviewPanel } from './preview_panel';
import { StreamRoutingContextProvider } from './state_management/stream_routing_state_machine';
import { QueryStreamCreationProvider } from './query_stream_creation_context';

interface ClassicStreamPartitioningProps {
  definition: Streams.ClassicStream.GetResponse;
  refreshDefinition: () => void;
}

export const ClassicStreamPartitioning = ({
  definition,
  refreshDefinition,
}: ClassicStreamPartitioningProps) => {
  const {
    core,
    dependencies,
    services: { telemetryClient },
  } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const { timeState$ } = useTimefilter();

  // No-op for classic — ingest fork success notifications are wired-only
  const forkSuccessNotifier = useMemo(() => () => {}, []);

  // Safe: classic streams only use queryMode, which never accesses wired-only fields.
  // Runtime guards (isClassicStream, getRuntimeMappings) prevent wired property access.
  const routingDefinition = definition as unknown as Streams.WiredStream.GetResponse;

  return (
    <StreamRoutingContextProvider
      definition={routingDefinition}
      refreshDefinition={refreshDefinition}
      core={core}
      data={data}
      timeState$={timeState$}
      streamsRepositoryClient={streamsRepositoryClient}
      forkSuccessNotifier={forkSuccessNotifier}
      telemetryClient={telemetryClient}
    >
      <ClassicStreamPartitioningImpl />
    </StreamRoutingContextProvider>
  );
};

const ClassicStreamPartitioningImpl = () => {
  return (
    <EuiFlexItem
      className={css`
        overflow: auto;
      `}
      grow
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        className={css`
          overflow: auto;
        `}
      >
        <QueryStreamCreationProvider>
          <EuiPanel
            hasShadow={false}
            className={css`
              display: flex;
              max-width: 100%;
              overflow: auto;
              flex-grow: 1;
            `}
            paddingSize="none"
          >
            <EuiResizableContainer>
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  <EuiResizablePanel
                    initialSize={40}
                    minSize="400px"
                    tabIndex={0}
                    paddingSize="l"
                    className={css`
                      overflow: auto;
                      display: flex;
                    `}
                  >
                    <ChildStreamList />
                  </EuiResizablePanel>

                  <EuiResizableButton indicator="border" />

                  <EuiResizablePanel
                    initialSize={60}
                    tabIndex={0}
                    minSize="300px"
                    paddingSize="l"
                    className={css`
                      display: flex;
                      flex-direction: column;
                    `}
                  >
                    <PreviewPanel />
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiPanel>
        </QueryStreamCreationProvider>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
