/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Whether the value is an absolute HTTP or HTTPS URL, the only kind the server fetches. */
export const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

/** The server's reason a logo could not be read, or a generic message. */
export const getLogoErrorMessage = (error: { body?: { message?: string } }): string =>
  error.body?.message ??
  i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.logo.loadErrorFallback', {
    defaultMessage: 'The logo could not be loaded.',
  });
