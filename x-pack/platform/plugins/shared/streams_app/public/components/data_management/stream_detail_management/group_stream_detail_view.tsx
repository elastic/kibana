/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { EuiButton, EuiDescriptionList, EuiLink, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { GroupStreamModificationFlyout } from '../../group_stream_modification_flyout/group_stream_modification_flyout';

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

  const meta = [
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.descriptionLabel', {
        defaultMessage: 'Description',
      }),
      description: stream.description,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      description: stream.group.tags.length
        ? stream.group.tags.join(', ')
        : i18n.translate('xpack.streams.groupStreamDetailView.noneLabel', {
            defaultMessage: 'None',
          }),
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
        {i18n.translate('xpack.streams.groupStreamDetailView.editButtonLabel', {
          defaultMessage: 'Edit',
        })}
      </EuiButton>
    </div>
  );
};
