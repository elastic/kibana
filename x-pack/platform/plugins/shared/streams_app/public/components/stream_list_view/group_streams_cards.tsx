/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiBadge,
} from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { StatefulStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function GroupStreamsCards({
  streams: allStreams,
}: {
  streams?: Array<{ stream: Streams.all.Definition }>;
}) {
  const router = useStreamsAppRouter();
  const groupStreams = allStreams
    ? allStreams
        .map((stream) => stream.stream)
        .filter((stream): stream is Streams.GroupStream.Definition =>
          Streams.GroupStream.Definition.is(stream)
        )
    : [];

  if (!groupStreams.length) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="m" alignItems="flexStart">
      {groupStreams.map((stream) => (
        <EuiFlexItem key={stream.name} grow={false}>
          <GroupStreamCard stream={stream} router={router} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function GroupStreamCard({
  stream,
  router,
}: {
  stream: Streams.GroupStream.Definition;
  router: StatefulStreamsAppRouter;
}) {
  return (
    <EuiPanel key={stream.name} paddingSize="m">
      <EuiText size="s">
        <EuiLink
          data-test-subj="streamsAppStreamNodeLink"
          href={router.link('/{key}', { path: { key: stream.name } })}
        >
          <h3>{stream.name}</h3>
        </EuiLink>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <p>{stream.description}</p>
        <p>
          {stream.group.members.length > 0
            ? i18n.translate('xpack.streams.groupStreamCard.membersLabel', {
                defaultMessage: '{count, plural, one {# member} other {# members}}',
                values: { count: stream.group.members.length },
              })
            : i18n.translate('xpack.streams.groupStreamCard.noMembersLabel', {
                defaultMessage: 'No members',
              })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {stream.group.tags.map((tag) => (
        <EuiBadge key={tag}>{tag}</EuiBadge>
      ))}
    </EuiPanel>
  );
}
