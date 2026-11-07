/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { describeRequestError } from '../../request_error';
import type { ErrorDetailsServices } from '../error_details';
import { RequestErrorDetails, showErrorToast } from '../error_details';

/**
 * Says a rule couldn't be deleted. The toast's title says so, and its details say why, with what
 * the server said, and a button that tries again.
 */
export const notifyRuleDeletionError = (
  services: ErrorDetailsServices,
  name: string,
  error: Error,
  onRetry: () => void
): void => {
  showErrorToast(services, {
    title: i18n.translate('xpack.boost.ruleDeletion.failedTitle', {
      defaultMessage: 'Unable to delete boost rule "{name}"',
      values: { name },
    }),
    details: (
      <RequestErrorDetails
        description={i18n.translate('xpack.boost.ruleDeletion.failedDescription', {
          defaultMessage: 'An error prevented this rule from being deleted. You can try again.',
        })}
        details={describeRequestError(error).details}
      />
    ),
    onRetry,
  });
};
