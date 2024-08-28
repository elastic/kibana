/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/cloud-security-posture-common';

const SEARCH_FAILED_TEXT = i18n.translate(
  'xpack.csp.findings.findingsErrorToast.searchFailedTitle',
  { defaultMessage: 'Search failed' }
);

export const showErrorToast = (
  toasts: CoreStart['notifications']['toasts'],
  error: unknown
): void => {
  if (error instanceof Error) toasts.addError(error, { title: SEARCH_FAILED_TEXT });
  else toasts.addDanger(extractErrorMessage(error, SEARCH_FAILED_TEXT));
};
