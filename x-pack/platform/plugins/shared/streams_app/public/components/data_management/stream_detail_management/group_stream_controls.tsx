/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { OverlayRef } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { GroupStreamModificationFlyout } from '../../group_stream_modification_flyout/group_stream_modification_flyout';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';

export function GroupStreamControls() {
  const router = useStreamsAppRouter();
  const context = useKibana();
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = context;
  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );
  const { definition, refresh: refreshDefinition } = useStreamDetail();
  const overlayRef = React.useRef<OverlayRef | null>(null);
  const { signal } = useAbortController();
  const { path } = useStreamsAppParams('/{key}/management/{tab}', true);

  function openGroupStreamModificationFlyout() {
    overlayRef.current?.close();
    overlayRef.current = core.overlays.openFlyout(
      toMountPoint(
        <StreamsAppContextProvider context={context}>
          <GroupStreamModificationFlyout
            client={streamsRepositoryClient}
            streamsList={streamsListFetch.value}
            refresh={() => {
              refreshDefinition();
              overlayRef.current?.close();
            }}
            notifications={core.notifications}
            existingStream={definition.stream as Streams.GroupStream.Definition}
            existingDashboards={definition.dashboards}
            startingTab={path.tab === 'dashboards' ? 'dashboards' : 'overview'}
          />
        </StreamsAppContextProvider>,
        core
      ),
      { size: 's' }
    );
  }

  function deleteGroupStream() {
    streamsRepositoryClient
      .fetch('DELETE /api/streams/{name} 2023-10-31', {
        params: { path: { name: definition.stream.name } },
        signal,
      })
      .then(() => {
        core.notifications.toasts.addSuccess(
          i18n.translate('xpack.streams.groupStreamDetailView.deleteSuccessToastMessage', {
            defaultMessage: '{name} was deleted',
            values: { name: definition.stream.name },
          })
        );
        router.push('/', {
          path: {},
          query: {},
        });
      })
      .catch((error) => {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('xpack.streams.groupStreamDetailView.deleteErrorToastMessage', {
            defaultMessage: 'Failed to delete {name}',
            values: { name: definition.stream.name },
          }),
        });
      });
  }

  const handleDeleteClick = useDiscardConfirm(deleteGroupStream, {
    title: i18n.translate('xpack.streams.groupStreamDetailView.deleteModalTitle', {
      defaultMessage: 'Delete {name}?',
      values: { name: definition.stream.name },
    }),
    message: i18n.translate('xpack.streams.groupStreamDetailView.deleteModalMessage', {
      defaultMessage: 'Are you sure you want to delete {name}?',
      values: { name: definition.stream.name },
    }),
    cancelButtonText: i18n.translate(
      'xpack.streams.groupStreamDetailView.deleteModalCancelButton',
      {
        defaultMessage: 'Cancel',
      }
    ),
    confirmButtonText: i18n.translate(
      'xpack.streams.groupStreamDetailView.deleteModalConfirmButton',
      {
        defaultMessage: 'Delete',
      }
    ),
    defaultFocusedButton: 'cancel',
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton onClick={openGroupStreamModificationFlyout}>
          {i18n.translate('xpack.streams.groupStreamDetailView.editButtonLabel', {
            defaultMessage: 'Edit',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton color="danger" onClick={handleDeleteClick}>
          {i18n.translate('xpack.streams.groupStreamDetailView.deleteButtonLabel', {
            defaultMessage: 'Delete',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
