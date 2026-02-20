/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiResizableContainer,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Streams } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { getTimeDifferenceInSeconds } from '@kbn/timerange';
import React, { useEffect } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import type { StatefulStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { ManagementBottomBar } from '../management_bottom_bar';
import { RequestPreviewFlyout } from '../request_preview_flyout';
import { useRequestPreviewFlyoutState } from '../request_preview_flyout/use_request_preview_flyout_state';
import { ChildStreamList } from './child_stream_list';
import { PreviewPanel } from './preview_panel';
import {
  StreamRoutingContextProvider,
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
  selectHasRoutingChanges,
} from './state_management/stream_routing_state_machine';
import { buildRoutingSaveRequestPayload, routingConverter } from './utils';
import { QueryStreamCreationProvider } from './query_stream_creation_context';

interface StreamDetailRoutingProps {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailRouting(props: StreamDetailRoutingProps) {
  const router = useStreamsAppRouter();
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

  return (
    <StreamRoutingContextProvider
      definition={props.definition}
      refreshDefinition={props.refreshDefinition}
      core={core}
      data={data}
      timeState$={timeState$}
      streamsRepositoryClient={streamsRepositoryClient}
      forkSuccessNofitier={createForkSuccessNofitier({ core, router })}
      telemetryClient={telemetryClient}
    >
      <StreamDetailRoutingImpl />
    </StreamRoutingContextProvider>
  );
}

export function StreamDetailRoutingImpl() {
  const {
    appParams,
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { cancelChanges, saveChanges } = useStreamRoutingEvents();

  const definition = useStreamsRoutingSelector((snapshot) => snapshot.context.definition);
  const routing = useStreamsRoutingSelector((snapshot) => snapshot.context.routing);
  const canSaveRouting = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.save' })
  );
  const canForkRouting = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'routingRule.fork' })
  );
  const canSaveSuggestion = useStreamsRoutingSelector((snapshot) =>
    snapshot.can({ type: 'suggestion.saveSuggestion' })
  );
  const isReordering = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: { reorderingRules: 'reordering' } } })
  );
  const isUpdatingStream = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: { reorderingRules: 'updatingStream' } } })
  );
  const hasRoutingChanges = useStreamsRoutingSelector((snapshot) =>
    selectHasRoutingChanges(snapshot.context)
  );

  const shouldDisplayBottomBar = isReordering && canSaveRouting && hasRoutingChanges;

  const { onPageReady } = usePerformanceContext();
  const { timeState } = useTimefilter();

  const streamsListFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams 2023-10-31', { signal });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, definition] // Refetch streams when the definition changes
  );

  const queryRangeSeconds = getTimeDifferenceInSeconds(timeState.timeRange);

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (!streamsListFetch.loading && streamsListFetch.value !== undefined) {
      const streamType = getStreamTypeFromDefinition(definition.stream);
      onPageReady({
        meta: {
          description: `[ttfmp_streams_detail_partitioning] streamType: ${streamType}`,
        },
        customMetrics: {
          key1: 'available_streams_count',
          value1: streamsListFetch.value?.streams?.length ?? 0,
          key2: 'queryRangeSeconds',
          value2: queryRangeSeconds,
        },
      });
    }
  }, [streamsListFetch, onPageReady, definition.stream, queryRangeSeconds]);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: canSaveRouting || canForkRouting || canSaveSuggestion,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
    shouldPromptOnReplace: false,
  });

  const availableStreams = streamsListFetch.value?.streams.map((stream) => stream.name) ?? [];
  const {
    isRequestPreviewFlyoutOpen,
    requestPreviewFlyoutCodeContent,
    openRequestPreviewFlyout,
    closeRequestPreviewFlyout,
  } = useRequestPreviewFlyoutState();

  const onBottomBarViewCodeClick = () => {
    const routingPayload = routing.map(routingConverter.toAPIDefinition);
    const body = buildRoutingSaveRequestPayload(definition, routingPayload);

    openRequestPreviewFlyout({
      method: 'PUT',
      url: `/api/streams/${definition.stream.name}/_ingest`,
      body,
    });
  };

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
                    <ChildStreamList availableStreams={availableStreams} />
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
        {shouldDisplayBottomBar && (
          <EuiFlexItem grow={false}>
            <ManagementBottomBar
              confirmButtonText={i18n.translate('xpack.streams.streamDetailRouting.change', {
                defaultMessage: 'Change routing',
              })}
              onCancel={cancelChanges}
              onConfirm={saveChanges}
              isLoading={isUpdatingStream}
              disabled={!canSaveRouting}
              insufficientPrivileges={!canSaveRouting}
              onViewCodeClick={onBottomBarViewCodeClick}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isRequestPreviewFlyoutOpen && (
        <RequestPreviewFlyout
          codeContent={requestPreviewFlyoutCodeContent}
          onClose={closeRequestPreviewFlyout}
        />
      )}
    </EuiFlexItem>
  );
}

const createForkSuccessNofitier =
  ({ core, router }: { core: CoreStart; router: StatefulStreamsAppRouter }) =>
  (streamName: string) =>
    core.notifications.toasts.addSuccess({
      title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
        defaultMessage: 'Stream saved',
      }),
      text: toMountPoint(
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppSaveOrUpdateChildrenOpenStreamInNewTabButton"
              size="s"
              target="_blank"
              href={router.link('/{key}/management/{tab}', {
                path: {
                  key: streamName,
                  tab: 'partitioning',
                },
              })}
            >
              {i18n.translate('xpack.streams.streamDetailRouting.view', {
                defaultMessage: 'Open stream in new tab',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>,
        core
      ),
    });
