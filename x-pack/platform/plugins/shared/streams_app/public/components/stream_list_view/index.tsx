/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiBetaBadge,
  useEuiTheme,
  EuiButton,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiLoadingElastic,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isEmpty } from 'lodash';
import type { OverlayRef } from '@kbn/core/public';
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

export function StreamListView() {
  const { euiTheme } = useEuiTheme();
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        share,
      },
    },
    core,
    isServerless,
  } = context;
  const onboardingLocator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const handleAddData = onboardingLocator
    ? () => {
        onboardingLocator.navigate({});
      }
    : undefined;

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

  // Always show settings flyout button if not serverless
  const showSettingsFlyoutButton = isServerless === false;
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
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
                  defaultMessage: 'Streams',
                })}
                {isServerless && (
                  <EuiBetaBadge
                    label={i18n.translate('xpack.streams.streamsListView.betaBadgeLabel', {
                      defaultMessage: 'Technical Preview',
                    })}
                    tooltipContent={i18n.translate(
                      'xpack.streams.streamsListView.betaBadgeDescription',
                      {
                        defaultMessage:
                          'This functionality is experimental and not supported. It may change or be removed at any time.',
                      }
                    )}
                    alignment="middle"
                    size="s"
                  />
                )}
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
            {showSettingsFlyoutButton && (
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
            )}
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
          <StreamsListEmptyPrompt onAddData={handleAddData} />
        ) : (
          <>
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
