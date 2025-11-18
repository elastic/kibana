/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Validates a pipeline ID in Kibana API level.
 * Pipeline ID must begin with a letter or underscore and contain only letters, underscores, dashes, hyphens, and numbers
 * Note that, frontend already validates the pipeline ID on UI.
 */
export function validatePipelineId(value: string): string | undefined {
  const pipelineIdPattern = /^[A-Za-z_][A-Za-z0-9\-_]*$/;
  if (!pipelineIdPattern.test(value)) {
    return i18n.translate('xpack.logstash.invalidPipelineIdErrorMessage', {
      defaultMessage:
        'Pipeline ID must begin with a letter or underscore and contain only letters, underscores, dashes, hyphens, and numbers',
    });
  }
  return undefined;
}
