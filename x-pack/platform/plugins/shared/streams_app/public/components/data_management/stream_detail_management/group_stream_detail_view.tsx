/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { EuiButton, EuiDescriptionList, EuiLink, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { GroupStreamModificationFlyout } from '../../group_stream_creation_flyout/group_stream_creation_flyout';

export const GroupStreamDetailView = ({
  definition,
  refreshDefinition,
}: {
  definition: Streams.GroupStream.GetResponse;
  refreshDefinition: () => void;
}) => {
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

  const overlayRef = React.useRef<OverlayRef | null>(null);

  function openGroupStreamModificationFlyout(existingStream?: Streams.GroupStream.Definition) {
    overlayRef.current?.close();
    overlayRef.current = core.overlays.openFlyout(
      toMountPoint(
        <GroupStreamModificationFlyout
          client={streamsRepositoryClient}
          streamsList={streamsListFetch.value}
          refresh={() => {
            refreshDefinition();
            overlayRef.current?.close();
          }}
          notifications={core.notifications}
          existingStream={existingStream}
        />,
        core
      ),
      { size: 's' }
    );
  }

  const stream = definition.stream;

  const renderLinks = (links: string[]) =>
    links.length
      ? links
          .map((link, idx) => (
            <EuiLink key={idx} href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </EuiLink>
          ))
          .reduce((prev, curr) => (
            <>
              {prev}, {curr}
            </>
          ))
      : 'None';

  const meta = [
    {
      title: 'Description',
      description: stream.description,
    },
    {
      title: 'Owner',
      description: stream.group.owner,
    },
    {
      title: 'Tier',
      description: stream.group.tier,
    },
    {
      title: 'Tags',
      description: stream.group.tags.length ? stream.group.tags.join(', ') : 'None',
    },
    {
      title: 'Runbook links',
      description: renderLinks(stream.group.runbook_links),
    },
    {
      title: 'Documentation links',
      description: renderLinks(stream.group.documentation_links),
    },
    {
      title: 'Repository links',
      description: renderLinks(stream.group.repository_links),
    },
  ];

  return (
    <div>
      <EuiDescriptionList textStyle="reverse" listItems={meta} />
      <EuiSpacer size="m" />
      <EuiButton
        onClick={() => {
          openGroupStreamModificationFlyout(stream);
        }}
      >
        Edit
      </EuiButton>
    </div>
  );
};
