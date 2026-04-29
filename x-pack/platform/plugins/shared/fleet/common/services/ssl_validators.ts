/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Validates that an SSL certificate field value does not contain whitespace
 * when it is a file path. PEM content (starting with `-----BEGIN`) is exempt
 * because it naturally contains spaces and newlines.
 *
 * Returns an i18n error string when invalid, undefined when valid.
 */
export function validateSslCertPath(value: string): string | undefined {
  if (!value || value.trimStart().startsWith('-----BEGIN')) return undefined;
  if (/\s/.test(value)) {
    return i18n.translate('xpack.fleet.sslValidation.pathSpacesError', {
      defaultMessage: 'SSL certificate path cannot contain spaces',
    });
  }
}
