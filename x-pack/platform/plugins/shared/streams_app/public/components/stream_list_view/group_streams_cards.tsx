/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
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
          <EuiCard
            key={stream.name}
            icon={<EuiIcon size="xxl" type="aggregate" color="primary" />}
            title={stream.name}
            description={stream.description}
            href={router.link('/{key}', { path: { key: stream.name } })}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
