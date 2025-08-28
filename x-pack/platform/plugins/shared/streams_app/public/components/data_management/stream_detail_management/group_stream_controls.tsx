/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiConfirmModal, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { OverlayRef } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Streams } from '@kbn/streams-schema';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { GroupStreamModificationFlyout } from '../../group_stream_modification_flyout/group_stream_modification_flyout';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';

export function GroupStreamControls() {
  const router = useStreamsAppRouter();
  const location = useLocation();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const routeParams = router.getParams('/{key}/management/{tab}', location);

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
            startingTab={routeParams.path.tab === 'dashboards' ? 'dashboards' : 'overview'}
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
      })
      .finally(() => setShowDeleteModal(false));
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton onClick={() => openGroupStreamModificationFlyout()}>
          {i18n.translate('xpack.streams.groupStreamDetailView.editButtonLabel', {
            defaultMessage: 'Edit',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton color="danger" onClick={() => setShowDeleteModal(true)}>
          {i18n.translate('xpack.streams.groupStreamDetailView.deleteButtonLabel', {
            defaultMessage: 'Delete',
          })}
        </EuiButton>
      </EuiFlexItem>

      {showDeleteModal && (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.streams.groupStreamDetailView.deleteModalAriaLabel', {
            defaultMessage: 'Delete {name}?',
            values: { name: definition.stream.name },
          })}
          title={i18n.translate('xpack.streams.groupStreamDetailView.deleteModalTitle', {
            defaultMessage: 'Delete {name}?',
            values: { name: definition.stream.name },
          })}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={deleteGroupStream}
          cancelButtonText={i18n.translate(
            'xpack.streams.groupStreamDetailView.deleteModalCancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.groupStreamDetailView.deleteModalConfirmButton',
            {
              defaultMessage: 'Delete',
            }
          )}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        />
      )}
    </EuiFlexGroup>
  );
}
