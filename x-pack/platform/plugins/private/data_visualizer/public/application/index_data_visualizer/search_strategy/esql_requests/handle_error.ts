/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface DataVizError extends Error {
  handled?: boolean;
}
export type HandleErrorCallback = (e: DataVizError, title?: string) => void;

export const handleError = ({
  onError,
  request,
  error,
  title,
}: {
  error: DataVizError;
  request: object;
  onError?: HandleErrorCallback;
  title?: string;
}) => {
  // Log error and request for debugging purposes
  // eslint-disable-next-line no-console
  console.error(error, request);
  if (onError) {
    error.handled = true;
    error.message = JSON.stringify(request);
    onError(
      error,
      title ??
        i18n.translate('xpack.dataVisualizer.esql.errorMessage', {
          defaultMessage: 'Error excecuting ES|QL request:',
        })
    );
  }
};
