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
  EuiButton,
  EuiFlexItem,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useAbortController } from '@kbn/react-hooks';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { NotificationsStart } from '@kbn/core/public';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsTreeTable } from './tree_table';
import { StreamsEmptyPrompt } from './empty_prompt';
import { StreamsAppPageTemplate } from '../streams_app_page_template';

function GroupStreamCreationFlyout({
  client,
  notifications,
}: {
  client: StreamsRepositoryClient;
  notifications: NotificationsStart;
}) {
  const { signal } = useAbortController();

  function createGroupStream() {
    client
      .fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          path: {
            name: 'my-group',
          },
          body: {
            stream: {
              group: {
                description: 'A group stream for Kibana',
                category: 'service',
                owner: 'Milton',
                tier: 1,
                tags: ['observability'],
                runbook_links: ['https://github.com/elastic/kibana'],
                documentation_links: ['https://github.com/elastic/kibana'],
                repository_links: ['https://github.com/elastic/kibana'],
                relationships: [
                  {
                    name: 'logs',
                    type: 'member',
                    filter: '*',
                  },
                ],
              },
            },
            dashboards: ['977e9ce4-03bc-48fd-9cd2-25c2a1ac2c71'],
            queries: [],
          },
        },
        signal,
      })
      .catch((error) => {
        notifications.toasts.addError(error, {
          title: 'Failed to create group stream',
        });
      });
  }

  return (
    <React.Fragment>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Create group</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiButton onClick={createGroupStream}>Create</EuiButton>
      </EuiModalBody>
    </React.Fragment>
  );
}

export function StreamListView() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core,
  } = useKibana();

  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  function openGroupStreamCreationFlyout() {
    core.overlays.openFlyout(
      toMountPoint(
        <GroupStreamCreationFlyout
          client={streamsRepositoryClient}
          notifications={core.notifications}
        />,
        core
      ),
      { size: 's' }
    );
  }

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        pageTitle={
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
                  defaultMessage: 'Streams',
                })}
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
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={openGroupStreamCreationFlyout}>Create group stream</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        {!streamsListFetch.loading && !streamsListFetch.value?.length ? (
          <StreamsEmptyPrompt />
        ) : (
          <StreamsTreeTable loading={streamsListFetch.loading} streams={streamsListFetch.value} />
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
