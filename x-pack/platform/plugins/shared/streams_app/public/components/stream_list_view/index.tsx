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
  useEuiTheme,
  EuiButton,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiLoadingElastic,
  EuiSpacer,
  EuiButtonEmpty,
  EuiPanel,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isEmpty } from 'lodash';
import type { OverlayRef } from '@kbn/core/public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
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
import { AssetImage } from '../asset_image';

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
            <WelcomePanel />
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

function WelcomePanel() {
  const {
    core: { docLinks },
  } = useKibana();
  const [isDismissed, setIsDismissed] = useLocalStorage('streamsWelcomePanelDismissed', false);

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <EuiPanel hasBorder={true} paddingSize="m" color="subdued" grow={false} borderRadius="m">
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <AssetImage type="yourPreviewWillAppearHere" size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.streams.streamsListView.welcomeTitle', {
                      defaultMessage: 'Welcome to Streams',
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.streamsListView.welcomeDescription', {
                    defaultMessage:
                      'Use Streams to organize and process your data into clear structured flows, and simplify routing, field extraction, and retention management.',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="row" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="primary"
                      size="s"
                      href={docLinks.links.observability.logsStreams}
                      target="_blank"
                      rel="noopener"
                    >
                      {i18n.translate('xpack.streams.streamsListView.learnMoreButtonLabel', {
                        defaultMessage: 'Go to docs',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      color="text"
                      size="s"
                      onClick={() => setIsDismissed(true)}
                      aria-label={i18n.translate(
                        'xpack.streams.streamsListView.dismissWelcomeButtonLabel',
                        {
                          defaultMessage: 'Dismiss welcome panel',
                        }
                      )}
                    >
                      {i18n.translate('xpack.streams.streamsListView.learnMoreButtonLabel', {
                        defaultMessage: 'Hide this',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="l" />
    </>
  );
}
