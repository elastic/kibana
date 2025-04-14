/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiButton, EuiFlexItem, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { IngestUpsertRequest, isCondition } from '@kbn/streams-schema';
import React from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { emptyEqualsToAlways } from '../../../util/condition';
import { useRoutingStateContext } from './hooks/routing_state';
import { getFormattedError } from '../../../util/errors';

export function ControlBar() {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { notifications } = core;
  const router = useStreamsAppRouter();

  const { definition, routingAppState, refreshDefinition } = useRoutingStateContext();

  const { signal } = useAbortController();

  if (!routingAppState.childUnderEdit && !routingAppState.hasChildStreamsOrderChanged) {
    return (
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiButton disabled data-test-subj="streamsAppStreamDetailRoutingSaveButton">
          {i18n.translate('xpack.streams.streamDetailRouting.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiFlexGroup>
    );
  }

  function forkChild() {
    if (!routingAppState.childUnderEdit) {
      return;
    }

    return streamsRepositoryClient.fetch('POST /api/streams/{name}/_fork 2023-10-31', {
      signal,
      params: {
        path: {
          name: definition.stream.name,
        },
        body: {
          if: emptyEqualsToAlways(routingAppState.childUnderEdit.child.if),
          stream: {
            name: routingAppState.childUnderEdit.child.destination,
          },
        },
      },
    });
  }

  // Persists edits to child streams and reorders of the child streams
  function updateChildren() {
    if (!routingAppState.childUnderEdit && !routingAppState.hasChildStreamsOrderChanged) {
      return;
    }

    const childUnderEdit = routingAppState.childUnderEdit?.child;
    const { stream } = definition;

    const routing = routingAppState.childStreams.map((child) =>
      child.destination === childUnderEdit?.destination ? childUnderEdit : child
    );

    const request = {
      ingest: {
        ...stream.ingest,
        wired: {
          ...stream.ingest.wired,
          routing,
        },
      },
    } as IngestUpsertRequest;

    return streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
      signal,
      params: {
        path: {
          name: stream.name,
        },
        body: request,
      },
    });
  }

  async function saveOrUpdateChildren() {
    if (!routingAppState.childUnderEdit && !routingAppState.hasChildStreamsOrderChanged) {
      return;
    }
    try {
      routingAppState.setSaveInProgress(true);

      if (routingAppState.childUnderEdit && routingAppState.childUnderEdit.isNew) {
        // Persist the child stream order changes first
        if (routingAppState.hasChildStreamsOrderChanged) {
          await updateChildren();
        }
        await forkChild();
      } else {
        await updateChildren();
      }

      routingAppState.setSaveInProgress(false);
      const toast = notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
          defaultMessage: 'Stream saved',
        }),
        text: routingAppState.childUnderEdit?.child.destination
          ? toMountPoint(
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="streamsAppSaveOrUpdateChildrenOpenStreamInNewTabButton"
                    size="s"
                    target="_blank"
                    href={router.link('/{key}/management/{tab}', {
                      path: {
                        key: routingAppState.childUnderEdit.child.destination,
                        tab: 'route',
                      },
                    })}
                  >
                    {i18n.translate('xpack.streams.streamDetailRouting.view', {
                      defaultMessage: 'Open stream in new tab',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>,
              core
            )
          : undefined,
      });
      routingAppState.setLastDisplayedToast(toast);
      routingAppState.selectChildUnderEdit(undefined);
      refreshDefinition();
    } catch (error) {
      routingAppState.setSaveInProgress(false);
      const toast = notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.failedToSave', {
          defaultMessage: 'Failed to save',
        }),
        toastMessage: getFormattedError(error).message,
      });
      routingAppState.setLastDisplayedToast(toast);
    }
  }

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      {routingAppState.childUnderEdit && !routingAppState.childUnderEdit.isNew && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="danger"
            size="s"
            disabled={routingAppState.saveInProgress || !definition.privileges.manage}
            data-test-subj="streamsAppRoutingStreamEntryRemoveButton"
            onClick={() => {
              routingAppState.setShowDeleteModal(true);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.remove', {
              defaultMessage: 'Remove',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <EuiButtonEmpty
          size="s"
          data-test-subj="streamsAppRoutingStreamEntryCancelButton"
          disabled={routingAppState.saveInProgress}
          onClick={() => {
            routingAppState.cancelChanges();
          }}
        >
          {i18n.translate('xpack.streams.streamDetailRouting.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiToolTip
          content={
            !definition.privileges.manage
              ? i18n.translate('xpack.streams.streamDetailRouting.onlySimulate', {
                  defaultMessage: "You don't have sufficient privileges to save changes.",
                })
              : undefined
          }
        >
          <EuiButton
            isLoading={routingAppState.saveInProgress}
            disabled={
              routingAppState.saveInProgress ||
              !definition.privileges.manage ||
              (routingAppState.childUnderEdit &&
                !isCondition(routingAppState.childUnderEdit.child.if))
            }
            onClick={saveOrUpdateChildren}
            data-test-subj="streamsAppStreamDetailRoutingSaveButton"
          >
            {routingAppState.childUnderEdit && routingAppState.childUnderEdit.isNew
              ? i18n.translate('xpack.streams.streamDetailRouting.add', {
                  defaultMessage: 'Save',
                })
              : i18n.translate('xpack.streams.streamDetailRouting.change', {
                  defaultMessage: 'Change routing',
                })}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
