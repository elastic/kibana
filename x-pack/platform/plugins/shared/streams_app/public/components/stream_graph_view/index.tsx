/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiLoadingElastic,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OverlayRef } from '@kbn/core/public';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { GroupStreamModificationFlyout } from '../group_stream_modification_flyout/group_stream_modification_flyout';
import { StreamsAppContextProvider } from '../streams_app_context_provider';
import { StreamsSettingsFlyout } from '../stream_list_view/streams_settings_flyout';
import { FeedbackButton } from '../feedback_button';
import { StreamsGraph } from '../streams_graph';

export function StreamGraphView() {
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

  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      }),
    [streamsRepositoryClient]
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
        tabs={[
          {
            id: 'table',
            label: i18n.translate('xpack.streams.streamsListView.tableTab', {
              defaultMessage: 'List',
            }),
            isSelected: false,
            onClick: () => router.push('/list', { path: {}, query: {} }),
          },
          {
            id: 'graph',
            label: i18n.translate('xpack.streams.streamsListView.graphTab', {
              defaultMessage: 'Graph',
            }),
            isSelected: true,
            onClick: () => router.push('/graph', { path: {}, query: {} }),
          },
        ]}
      />
      <StreamsAppPageTemplate.Body grow>
        {streamsListFetch.loading && streamsListFetch.value === undefined ? (
          <EuiEmptyPrompt
            icon={<EuiLoadingElastic size="xl" />}
            title={
              <h2>
                {i18n.translate('xpack.streams.streamsGraphView.loadingStreams', {
                  defaultMessage: 'Loading Streams',
                })}
              </h2>
            }
          />
        ) : (
          <StreamsGraph
            streams={streamsListFetch.value?.streams || []}
            loading={streamsListFetch.loading}
          />
        )}
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
