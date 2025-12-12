/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  useEuiTheme,
  EuiButton,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiLoadingElastic,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isEmpty } from 'lodash';
import type { OverlayRef } from '@kbn/core/public';
import { Streams } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsTreeTable } from './tree_table';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamsListEmptyPrompt } from './streams_list_empty_prompt';
import { useTimefilter } from '../../hooks/use_timefilter';
import { GroupStreamModificationFlyout } from '../group_stream_modification_flyout/group_stream_modification_flyout';
import { GroupStreamsCards } from './group_streams_cards';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { StreamsAppContextProvider } from '../streams_app_context_provider';
import { StreamsSettingsFlyout } from './streams_settings_flyout';
import { FeedbackButton } from '../feedback_button';
import { WelcomeTourCallout } from '../streams_tour';

export function StreamListView() {
  const { euiTheme } = useEuiTheme();
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core,
  } = context;

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

  const { hasClassicStreams, firstClassicStreamName } = useMemo(() => {
    const allStreams = streamsListFetch.value?.streams ?? [];
    const classicStreams = allStreams.filter(
      (item) => item.stream && Streams.ClassicStream.Definition.is(item.stream)
    );
    return {
      hasClassicStreams: classicStreams.length > 0,
      firstClassicStreamName: classicStreams[0]?.stream?.name,
    };
  }, [streamsListFetch.value?.streams]);

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
      />
      <StreamsAppPageTemplate.Body grow>
        {streamsListFetch.loading && streamsListFetch.value === undefined ? (
          <EuiEmptyPrompt
            icon={<EuiLoadingElastic size="xl" />}
            title={
              <h2>
                {i18n.translate('xpack.streams.streamsListView.loadingStreams', {
                  defaultMessage: 'Loading Streams',
                })}
              </h2>
            }
          />
        ) : !streamsListFetch.loading && isEmpty(streamsListFetch.value?.streams) ? (
          <StreamsListEmptyPrompt />
        ) : (
          <>
            <WelcomeTourCallout
              hasClassicStreams={hasClassicStreams}
              firstClassicStreamName={firstClassicStreamName}
            />
            <StreamsTreeTable
              loading={streamsListFetch.loading}
              streams={streamsListFetch.value?.streams}
              canReadFailureStore={streamsListFetch.value?.canReadFailureStore}
            />
            {groupStreams?.enabled && (
              <>
                <EuiSpacer size="l" />
                <GroupStreamsCards streams={streamsListFetch.value?.streams} />
              </>
            )}
          </>
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
