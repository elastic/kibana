/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function StreamDetailReferencesView({
  definition,
}: {
  definition: Streams.all.GetResponse;
}) {
  const router = useStreamsAppRouter();

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
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

  if (streamsListFetch.loading) {
    return <EuiLoadingSpinner />;
  }

  if (!streamsListFetch.value) {
    return null;
  }

  const streams = streamsListFetch.value;

  const notMemberOfAnyGroupsMessage = i18n.translate(
    'xpack.streams.streamDetailReferencesView.notMemberOfAnyGroups',
    {
      defaultMessage: 'Not a member of any Group streams',
    }
  );

  if (Streams.ingest.all.GetResponse.is(definition)) {
    const referencingGroups = streams
      .filter((stream) => Streams.GroupStream.Definition.is(stream.stream))
      .filter((stream) =>
        (stream.stream as Streams.GroupStream.Definition).group.members.includes(
          definition.stream.name
        )
      );

    return referencingGroups.length === 0 ? (
      notMemberOfAnyGroupsMessage
    ) : (
      <>
        {i18n.translate('xpack.streams.streamDetailReferencesView.memberOfHeader', {
          defaultMessage: 'Member of:',
        })}
        <EuiSpacer size="s" />
        <EuiListGroup bordered={true}>
          {referencingGroups.map((stream) => (
            <EuiListGroupItem
              key={stream.stream.name}
              label={stream.stream.name}
              href={router.link('/{key}', {
                path: {
                  key: stream.stream.name,
                },
              })}
            />
          ))}
        </EuiListGroup>
      </>
    );
  }

  const referencingGroups = streams
    .filter((stream) => Streams.GroupStream.Definition.is(stream.stream))
    .filter((stream) =>
      (stream.stream as Streams.GroupStream.Definition).group.members.includes(
        definition.stream.name
      )
    );

  return (
    <>
      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem>
          {definition.stream.group.members.length === 0 ? (
            i18n.translate('xpack.streams.streamDetailReferencesView.noMembers', {
              defaultMessage: 'No members',
            })
          ) : (
            <>
              {i18n.translate('xpack.streams.streamDetailReferencesView.membersHeader', {
                defaultMessage: 'Members:',
              })}
              <EuiSpacer size="s" />
              <EuiListGroup bordered={true}>
                {definition.stream.group.members.map((memberName: string) => (
                  <EuiListGroupItem
                    key={memberName}
                    label={memberName}
                    href={router.link('/{key}', {
                      path: {
                        key: memberName,
                      },
                    })}
                  />
                ))}
              </EuiListGroup>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          {referencingGroups.length === 0 ? (
            notMemberOfAnyGroupsMessage
          ) : (
            <>
              {i18n.translate('xpack.streams.streamDetailReferencesView.memberOfHeader', {
                defaultMessage: 'Member of:',
              })}
              <EuiSpacer size="s" />
              <EuiListGroup bordered={true}>
                {referencingGroups.map((stream) => (
                  <EuiListGroupItem
                    key={stream.stream.name}
                    label={stream.stream.name}
                    href={router.link('/{key}', {
                      path: {
                        key: stream.stream.name,
                      },
                    })}
                  />
                ))}
              </EuiListGroup>
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
