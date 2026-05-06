/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// PEM content (-----BEGIN ...) is exempt — it naturally contains whitespace
export function validateSslCertPath(value: string): string | undefined {
  if (!value || value.trimStart().startsWith('-----BEGIN')) return undefined;
  if (/\s/.test(value)) {
    return i18n.translate('xpack.fleet.sslValidation.pathSpacesError', {
      defaultMessage: 'SSL certificate path cannot contain whitespace',
    });
  }
  // Must contain at least one path separator, or start with an env-var sigil ($, %)
  if (!value.includes('/') && !value.includes('\\') && !/^[$%]/.test(value)) {
    return i18n.translate('xpack.fleet.sslValidation.pathFormatError', {
      defaultMessage: 'SSL certificate path must be a valid file path (e.g. /path/to/cert.pem)',
    });
  }
}
