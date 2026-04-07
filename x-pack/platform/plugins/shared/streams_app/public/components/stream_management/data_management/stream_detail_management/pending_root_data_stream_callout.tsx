/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../../../hooks/use_kibana';

export function PendingRootDataStreamCallout({
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
      notifications: { toasts },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();

  const createDataStream = useCallback(async () => {
    await streamsRepositoryClient.fetch('POST /internal/streams/{name}/_restore_data_stream', {
      params: {
        path: {
          name: streamName,
        },
      },
      signal: abortController.signal,
    });

    toasts.addSuccess(
      i18n.translate('xpack.streams.pendingRootDataStream.create.successToast', {
        defaultMessage: 'Data stream created',
      })
    );
    refreshDefinition();
  }, [abortController.signal, refreshDefinition, streamName, streamsRepositoryClient, toasts]);

  return (
    <EuiCallOut
      color="primary"
      title={i18n.translate('xpack.streams.pendingRootDataStream.title', {
        defaultMessage: 'No data stream yet',
      })}
    >
      <p>
        {i18n.translate('xpack.streams.pendingRootDataStream.description', {
          defaultMessage:
            'Start sending data to get started. The data stream will be created automatically when data is first ingested. Or create it now to start configuring.',
        })}{' '}
        <EuiLink
          href="https://www.elastic.co/docs/solutions/observability/streams/wired-streams#streams-wired-streams-ship"
          target="_blank"
          external
        >
          {i18n.translate('xpack.streams.pendingRootDataStream.docsLink', {
            defaultMessage: 'Learn how to send data',
          })}
        </EuiLink>
      </p>
      <EuiButton onClick={createDataStream} isDisabled={!canManage}>
        {i18n.translate('xpack.streams.pendingRootDataStream.createButton', {
          defaultMessage: 'Create data stream without data and start configuring',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
