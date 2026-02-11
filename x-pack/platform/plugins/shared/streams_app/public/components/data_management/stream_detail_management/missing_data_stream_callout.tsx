/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../../hooks/use_kibana';

export function MissingDataStreamCallout({
  streamName,
  canManage,
  refreshDefinition,
}: {
  streamName: string;
  canManage: boolean;
  refreshDefinition: () => void;
}) {
  const {
    core: {
      application: { navigateToApp },
      notifications: { toasts },
      overlays,
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();

  const restoreStream = useCallback(async () => {
    await streamsRepositoryClient.fetch('POST /internal/streams/{name}/_restore_data_stream', {
      params: {
        path: {
          name: streamName,
        },
      },
      signal: abortController.signal,
    });

    toasts.addSuccess(
      i18n.translate('xpack.streams.missingDataStream.restore.successToast', {
        defaultMessage: 'Data stream restore triggered',
      })
    );
    refreshDefinition();
  }, [abortController.signal, refreshDefinition, streamName, streamsRepositoryClient, toasts]);

  const deleteStreamProperly = useCallback(async () => {
    const confirmed = await overlays.openConfirm(
      i18n.translate('xpack.streams.missingDataStream.delete.confirm.body', {
        defaultMessage:
          'This will delete the stream definition. You can recreate it later, but any dependent configuration will be lost.',
      }),
      {
        title: i18n.translate('xpack.streams.missingDataStream.delete.confirm.title', {
          defaultMessage: 'Delete stream properly?',
        }),
        confirmButtonText: i18n.translate(
          'xpack.streams.missingDataStream.delete.confirm.confirmButtonText',
          { defaultMessage: 'Delete stream' }
        ),
        cancelButtonText: i18n.translate(
          'xpack.streams.missingDataStream.delete.confirm.cancelButtonText',
          { defaultMessage: 'Cancel' }
        ),
        buttonColor: 'danger',
      }
    );

    if (!confirmed) {
      return;
    }

    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: streamName } },
      signal: abortController.signal,
    });

    toasts.addSuccess(
      i18n.translate('xpack.streams.missingDataStream.delete.successToast', {
        defaultMessage: 'Stream deleted',
      })
    );
    navigateToApp('/streams');
  }, [
    abortController.signal,
    navigateToApp,
    overlays,
    streamName,
    streamsRepositoryClient,
    toasts,
  ]);

  return (
    <EuiCallOut
      data-test-subj="streamsMissingDataStreamCallout"
      announceOnMount
      title={i18n.translate('xpack.streams.missingDataStream.title', {
        defaultMessage: 'Data stream missing',
      })}
      color="danger"
      iconType="error"
    >
      <p>
        {i18n.translate('xpack.streams.missingDataStream.description', {
          defaultMessage:
            'The underlying Elasticsearch data stream for this stream is missing or not accessible. Make sure you have sufficient privileges and the data stream exists.',
        })}
      </p>

      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.missingDataStream.actions.helpText', {
            defaultMessage:
              'To return to a working state, restore the stream. If this stream should be removed, delete it properly to clean up its definition.',
          })}
        </p>
      </EuiText>

      <EuiFlexGroup responsive={false} gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="streamsMissingDataStreamRestoreButton"
            onClick={restoreStream}
            isDisabled={!canManage}
          >
            {i18n.translate('xpack.streams.missingDataStream.restore.buttonLabel', {
              defaultMessage: 'Restore stream',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="streamsMissingDataStreamDeleteButton"
            color="danger"
            onClick={deleteStreamProperly}
            isDisabled={!canManage}
          >
            {i18n.translate('xpack.streams.missingDataStream.delete.buttonLabel', {
              defaultMessage: 'Delete stream properly',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}

