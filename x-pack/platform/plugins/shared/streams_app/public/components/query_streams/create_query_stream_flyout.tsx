/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../util/errors';
import { QueryStreamFlyout } from './query_stream_flyout';

interface CreateQueryStreamFlyoutProps {
  onQueryStreamCreated: () => void;
}

export function CreateQueryStreamFlyout({ onQueryStreamCreated }: CreateQueryStreamFlyoutProps) {
  const [isFlyoutOpen, { toggle: toggleFlyout, off: closeFlyout }] = useBoolean(false);

  return (
    <>
      <EuiButton onClick={toggleFlyout} size="s" fill>
        {i18n.translate('xpack.streams.streamsListView.createQueryStreamButtonLabel', {
          defaultMessage: 'Create Query stream',
        })}
      </EuiButton>
      {isFlyoutOpen && (
        <CreateQueryStreamFlyoutContent
          onClose={closeFlyout}
          onQueryStreamCreated={onQueryStreamCreated}
        />
      )}
    </>
  );
}

const CreateQueryStreamFlyoutContent = ({
  onClose,
  onQueryStreamCreated,
}: {
  onClose: () => void;
  onQueryStreamCreated: () => void;
}) => {
  const { dependencies, core } = useKibana();
  const { notifications } = core;
  const {
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const handleQueryStreamCreation = async (
    formData: { name: string; esqlQuery: string },
    signal: AbortSignal
  ) => {
    try {
      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_query 2023-10-31', {
        params: { path: { name: formData.name }, body: { query: { esql: formData.esqlQuery } } },
        signal,
      });
      onQueryStreamCreated();
      onClose();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.createQueryStreamFlyout.successTitle', {
          defaultMessage: 'Query stream created successfully',
        }),
        toastLifeTimeMs: 3000,
      });
    } catch (error) {
      const formattedError = getFormattedError(error);
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.createQueryStreamFlyout.errorTitle', {
          defaultMessage: 'Error creating query stream',
        }),
        text: formattedError.message,
        toastLifeTimeMs: 3000,
      });
    }
  };

  return (
    <QueryStreamFlyout
      title={i18n.translate('xpack.streams.createQueryStreamFlyout.createQueryStreamTitleLabel', {
        defaultMessage: 'Create Query Stream',
      })}
      onClose={onClose}
      onSubmit={handleQueryStreamCreation}
      showNameField
    />
  );
};
