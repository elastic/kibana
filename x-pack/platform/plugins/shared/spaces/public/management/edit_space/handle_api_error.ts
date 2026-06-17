/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { Logger } from '@kbn/logging';

interface HandleErrorDeps {
  toasts: NotificationsStart['toasts'];
  logger: Logger;
}

export const handleApiError = (error: any, deps: HandleErrorDeps) => {
  const { logger, toasts } = deps;

  const message = error?.body?.message ?? error.toString();

  logger.error(message);
  logger.error(error);

  toasts.addError(error, {
    title: message,
  });
};
