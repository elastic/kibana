/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Namespace string eventually becomes part of an index name. This method partially implements index name rules from
// https://github.com/elastic/elasticsearch/blob/master/docs/reference/indices/create-index.asciidoc
// and implements a limit based on https://github.com/elastic/kibana/issues/75846
export function isValidNamespace(
  namespace: string,
  allowBlankNamespace?: boolean
): { valid: boolean; error?: string } {
  if (!namespace.trim() && !allowBlankNamespace) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.requiredErrorMessage', {
        defaultMessage: 'Namespace is required',
      }),
    };
  } else if (namespace !== namespace.toLowerCase()) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.lowercaseErrorMessage', {
        defaultMessage: 'Namespace must be lowercase',
      }),
    };
  } else if (INVALID_NAMESPACE_CHARACTERS.test(namespace)) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.invalidCharactersErrorMessage', {
        defaultMessage: 'Namespace contains invalid characters',
      }),
    };
  }
  // Node.js doesn't have Blob, and browser doesn't have Buffer :)
  else if (
    (typeof Blob === 'function' && new Blob([namespace]).size > 100) ||
    (typeof Buffer === 'function' && Buffer.from(namespace).length > 100)
  ) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.tooLongErrorMessage', {
        defaultMessage: 'Namespace cannot be more than 100 bytes',
      }),
    };
  }

  return { valid: true };
}

export const INVALID_NAMESPACE_CHARACTERS = /[\*\\/\?"<>|\s,#:-]+/;
