/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { i18n } from '@kbn/i18n';

/**
 * Route guard for every memory endpoint.
 *
 * Throws 404 rather than 403: a feature that is switched off should not
 * advertise its own existence.
 */
export const assertMemoryEnabled = (isMemoryEnabled: () => boolean): void => {
  if (!isMemoryEnabled()) {
    throw notFound(
      i18n.translate('xpack.agentMemory.errors.memoryDisabled', {
        defaultMessage: 'Agent memory is not enabled',
      })
    );
  }
};
