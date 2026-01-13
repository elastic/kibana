/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import React, { useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { getStreamTypeFromDefinition } from '../../util/get_stream_type_from_definition';

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
  const { onPageReady } = usePerformanceContext();

  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (definition && !streamsListFetch.loading && streamsListFetch.value) {
      const streams = streamsListFetch.value;
      const referencingGroupsCount = streams
        .filter((stream) => Streams.GroupStream.Definition.is(stream.stream))
        .filter((stream) =>
          (stream.stream as Streams.GroupStream.Definition).group.members.includes(
            definition.stream.name
          )
        ).length;

      const isGroupStream = Streams.GroupStream.Definition.is(definition.stream);
      const streamType = getStreamTypeFromDefinition(definition.stream);

      onPageReady({
        meta: {
          description: `[ttfmp_streams_detail_references] streamType: ${streamType}`,
        },
        customMetrics: {
          key1: 'total_streams_count',
          value1: streams.length,
          key2: 'referencing_groups_count',
          value2: referencingGroupsCount,
          ...(isGroupStream && {
            key3: 'member_count',
            value3: (definition.stream as Streams.GroupStream.Definition).group.members.length,
          }),
        },
      });
    }
  }, [definition, streamsListFetch.loading, streamsListFetch.value, onPageReady]);

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
