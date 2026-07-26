/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../util/errors';
import { QueryStreamFlyout } from './query_stream_flyout';

interface EditQueryStreamFlyoutProps {
  definition: Streams.QueryStream.GetResponse;
  onClose: () => void;
  onSave: () => void;
}

export function EditQueryStreamFlyout({ definition, onClose, onSave }: EditQueryStreamFlyoutProps) {
  const { dependencies, core } = useKibana();
  const { notifications } = core;
  const {
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const streamName = definition.stream.name;
  const resolvedEsql = definition.stream.query.esql;

  const handleQueryStreamUpdate = async (
    formData: { name: string; esqlQuery: string },
    signal: AbortSignal
  ) => {
    try {
      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_query 2023-10-31', {
        params: { path: { name: streamName }, body: { query: { esql: formData.esqlQuery } } },
        signal,
      });
      onSave();
      onClose();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.editQueryStreamFlyout.successTitle', {
          defaultMessage: 'Query stream updated successfully',
        }),
        toastLifeTimeMs: 3000,
      });
    } catch (error) {
      const formattedError = getFormattedError(error);
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.editQueryStreamFlyout.errorTitle', {
          defaultMessage: 'Error updating query stream',
        }),
        text: formattedError.message,
        toastLifeTimeMs: 3000,
      });
    }
  };

  return (
    <QueryStreamFlyout
      title={i18n.translate('xpack.streams.editQueryStreamFlyout.editQueryStreamTitleLabel', {
        defaultMessage: 'Edit Query Stream: {streamName}',
        values: { streamName },
      })}
      onClose={onClose}
      onSubmit={handleQueryStreamUpdate}
      initialEsql={resolvedEsql}
      disableSubmitWhenLoading
    />
  );
}
