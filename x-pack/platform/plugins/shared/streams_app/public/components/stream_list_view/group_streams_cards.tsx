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
import { StatefulStreamsAppRouter, useStreamsAppRouter } from '../../hooks/use_streams_app_router';

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

  // group by category
  const groupedStreams = groupStreams.reduce((acc, stream) => {
    const category = stream.group.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(stream);
    return acc;
  }, {} as Record<string, Streams.GroupStream.Definition[]>);

  // order categories: products, applications, services, infrastructure, orgs, then alphabetical for remaining categories
  const explicitOrder = ['products', 'applications', 'services', 'infrastructure', 'orgs'];
  const allCategories = Object.keys(groupedStreams);
  const orderedCategories = explicitOrder
    .filter((c) => allCategories.includes(c))
    .concat(
      allCategories.filter((c) => !explicitOrder.includes(c)).sort((a, b) => a.localeCompare(b))
    );

  // render each category
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {orderedCategories.map((category) => (
        <EuiFlexItem key={category} grow={false}>
          <EuiText size="m">
            <h2>{category}</h2>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="row" wrap>
            {groupedStreams[category].map((stream) => (
              <EuiFlexItem key={stream.name} grow={false}>
                <GroupStreamCard stream={stream} router={router} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
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
        <p>Owner: {stream.group.owner}</p>
        <p>Tier: {stream.group.tier}</p>
      </EuiText>
      <EuiSpacer size="m" />
      {stream.group.tags.map((tag) => (
        <EuiBadge key={tag}>{tag}</EuiBadge>
      ))}
    </EuiPanel>
  );
}
