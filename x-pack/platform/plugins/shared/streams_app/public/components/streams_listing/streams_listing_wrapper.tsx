/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, useEuiTheme, EuiButton, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OverlayRef } from '@kbn/core/public';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsAppRoutePath } from '../../hooks/use_streams_app_route_path';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { useTimefilter } from '../../hooks/use_timefilter';
import { GroupStreamModificationFlyout } from '../group_stream_modification_flyout/group_stream_modification_flyout';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { StreamsAppContextProvider } from '../streams_app_context_provider';
import { FeedbackButton } from '../feedback_button';
import { StreamsSettingsFlyout } from '../stream_list_view/streams_settings_flyout';
import { StreamsList } from '../stream_list_view/streams_list';
import { StreamsGraph } from '../streams_graph';

export function StreamsViews() {
  const { euiTheme } = useEuiTheme();
  const context = useKibana();
  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core,
  } = context;

  const currentPath = useStreamsAppRoutePath();
  const selectedTab = currentPath === '/graph' ? 'graph' : 'list';

  const { timeState } = useTimefilter();
  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      }),
    // time state change is used to trigger a refresh of the listed
    // streams metadata but we operate on stale data if we don't
    // also refresh the streams
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, timeState.start, timeState.end]
  );

  const {
    features: { groupStreams },
  } = useStreamsPrivileges();

  const overlayRef = React.useRef<OverlayRef | null>(null);

  const [isSettingsFlyoutOpen, setIsSettingsFlyoutOpen] = React.useState(false);

  function openGroupStreamModificationFlyout() {
    overlayRef.current?.close();
    overlayRef.current = core.overlays.openFlyout(
      toMountPoint(
        <StreamsAppContextProvider context={context}>
          <GroupStreamModificationFlyout
            client={streamsRepositoryClient}
            streamsList={streamsListFetch.value?.streams}
            refresh={() => {
              streamsListFetch.refresh();
              overlayRef.current?.close();
            }}
            notifications={core.notifications}
          />
        </StreamsAppContextProvider>,
        core
      ),
      { size: 's' }
    );
  }

  const tabs = [
    {
      id: 'list',
      label: i18n.translate('xpack.streams.listingWrapper.listTab', {
        defaultMessage: 'List',
      }),
      href: router.link('/list'),
      content: <StreamsList streamsListFetch={streamsListFetch} />,
    },
    {
      id: 'graph',
      label: i18n.translate('xpack.streams.listingWrapper.graphTab', {
        defaultMessage: 'Graph',
      }),
      href: router.link('/graph'),
      content: (
        <StreamsGraph
          streams={streamsListFetch.value?.streams}
          loading={streamsListFetch.loading}
        />
      ),
    },
  ];

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
                  defaultMessage: 'Streams',
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            {groupStreams?.enabled && (
              <EuiFlexItem grow={false}>
                <EuiButton onClick={openGroupStreamModificationFlyout} size="s">
                  {i18n.translate('xpack.streams.streamsListView.createGroupStreamButtonLabel', {
                    defaultMessage: 'Create Group stream',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="gear"
                size="s"
                onClick={() => setIsSettingsFlyoutOpen(true)}
                aria-label={i18n.translate('xpack.streams.streamsListView.settingsButtonLabel', {
                  defaultMessage: 'Settings',
                })}
              >
                {i18n.translate('xpack.streams.streamsListView.settingsButtonLabel', {
                  defaultMessage: 'Settings',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <FeedbackButton />
          </EuiFlexGroup>
        }
        tabs={tabs.map(({ id, label, href }) => ({
          label,
          isSelected: selectedTab === id,
          href,
        }))}
      />
      <StreamsAppPageTemplate.Body grow>
        {tabs.find((tab) => tab.id === selectedTab)?.content}
      </StreamsAppPageTemplate.Body>
      {isSettingsFlyoutOpen && (
        <StreamsSettingsFlyout
          onClose={() => setIsSettingsFlyoutOpen(false)}
          refreshStreams={streamsListFetch.refresh}
        />
      )}
    </>
  );
}
