/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiResizableContainer,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { Streams } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CoreStart } from '@kbn/core/public';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { ChildStreamList } from './child_stream_list';
import {
  StreamRoutingContextProvider,
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { ManagementBottomBar } from '../management_bottom_bar';
import { PreviewPanel } from './preview_panel';
import {
  StatefulStreamsAppRouter,
  useStreamsAppRouter,
} from '../../../hooks/use_streams_app_router';

interface StreamDetailRoutingProps {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailRouting(props: StreamDetailRoutingProps) {
  const router = useStreamsAppRouter();
  const { core, dependencies } = useKibana();
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
    >
      <StreamDetailRoutingImpl />
    </StreamRoutingContextProvider>
  );
}

export function StreamDetailRoutingImpl() {
  const { appParams, core } = useKibana();

  const routingSnapshot = useStreamsRoutingSelector((snapshot) => snapshot);
  const { cancelChanges, saveChanges } = useStreamRoutingEvents();

  const definition = routingSnapshot.context.definition;

  const shouldDisplayBottomBar =
    routingSnapshot.matches({ ready: { reorderingRules: 'reordering' } }) &&
    routingSnapshot.can({ type: 'routingRule.save' });

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const streamsListFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams 2023-10-31', { signal });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, definition] // Refetch streams when the definition changes
  );

  useUnsavedChangesPrompt({
    hasUnsavedChanges:
      routingSnapshot.can({ type: 'routingRule.save' }) ||
      routingSnapshot.can({ type: 'routingRule.fork' }),
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
  });

  const availableStreams = streamsListFetch.value?.streams.map((stream) => stream.name) ?? [];
  const isVerticalLayout = useIsWithinBreakpoints(['xs', 's']);

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
        <EuiPanel
          hasShadow={false}
          hasBorder
          className={css`
            display: flex;
            max-width: 100%;
            overflow: auto;
            flex-grow: 1;
          `}
          paddingSize="xs"
        >
          <EuiResizableContainer direction={isVerticalLayout ? 'vertical' : 'horizontal'}>
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel
                  initialSize={40}
                  minSize="150px"
                  tabIndex={0}
                  paddingSize="s"
                  color="subdued"
                  className={css`
                    overflow: auto;
                    display: flex;
                  `}
                >
                  <ChildStreamList availableStreams={availableStreams} />
                </EuiResizablePanel>

                <EuiResizableButton accountForScrollbars="both" />

                <EuiResizablePanel
                  initialSize={60}
                  tabIndex={0}
                  minSize="300px"
                  paddingSize="s"
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
        {shouldDisplayBottomBar && (
          <EuiFlexItem grow={false}>
            <ManagementBottomBar
              confirmButtonText={i18n.translate('xpack.streams.streamDetailRouting.change', {
                defaultMessage: 'Change routing',
              })}
              onCancel={cancelChanges}
              onConfirm={saveChanges}
              isLoading={routingSnapshot.matches({ ready: { reorderingRules: 'updatingStream' } })}
              disabled={!routingSnapshot.can({ type: 'routingRule.save' })}
              insufficientPrivileges={!routingSnapshot.can({ type: 'routingRule.save' })}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
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
                  tab: 'route',
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
