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
  allowBlankNamespace?: boolean,
  allowedNamespacePrefixes?: string[]
): { valid: boolean; error?: string } {
  if (!namespace.trim() && allowBlankNamespace) {
    return { valid: true };
  }

  const { valid, error } = isValidEntity(namespace, 'Namespace', allowBlankNamespace);
  if (!valid) {
    return { valid, error };
  }

  for (const prefix of allowedNamespacePrefixes || []) {
    if (!namespace.trim().startsWith(prefix)) {
      return allowedNamespacePrefixes?.length === 1
        ? {
            valid: false,
            error: i18n.translate('xpack.fleet.namespaceValidation.notAllowedPrefixError', {
              defaultMessage: 'Namespace should start with {allowedNamespacePrefixes}',
              values: {
                allowedNamespacePrefixes: allowedNamespacePrefixes?.[0],
              },
            }),
          }
        : {
            valid: false,
            error: i18n.translate('xpack.fleet.namespaceValidation.notAllowedPrefixesError', {
              defaultMessage:
                'Namespace should start with one of these prefixes {allowedNamespacePrefixes}',
              values: {
                allowedNamespacePrefixes: allowedNamespacePrefixes?.join(', ') ?? '',
              },
            }),
          };
    }
  }
  return { valid: true };
}

export function isValidDataset(
  dataset: string,
  allowBlank?: boolean
): { valid: boolean; error?: string } {
  const { valid, error } = isValidEntity(dataset, 'Dataset', allowBlank);
  if (!valid) {
    return { valid, error };
  }
  if (dataset.startsWith('_') || dataset.startsWith('.')) {
    return {
      valid: false,
      error: i18n.translate(
        'xpack.fleet.datasetValidation.datasetStartsWithUnderscoreErrorMessage',
        {
          defaultMessage: 'Dataset cannot start with an underscore or dot',
        }
      ),
    };
  }
  return { valid, error };
}

function isValidEntity(
  name: string,
  type: string,
  allowBlank?: boolean
): { valid: boolean; error?: string } {
  if (!name.trim() && !allowBlank) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.requiredErrorMessage', {
        defaultMessage: '{type} is required',
        values: { type },
      }),
    };
  } else if (name !== name.toLowerCase()) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.lowercaseErrorMessage', {
        defaultMessage: '{type} must be lowercase',
        values: { type },
      }),
    };
  } else if (INVALID_NAMESPACE_CHARACTERS.test(name)) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.invalidCharactersErrorMessage', {
        defaultMessage: '{type} contains invalid characters',
        values: { type },
      }),
    };
  }
  // Node.js doesn't have Blob, and browser doesn't have Buffer :)
  else if (
    (typeof Blob === 'function' && new Blob([name]).size > 100) ||
    (typeof Buffer === 'function' && Buffer.from(name).length > 100)
  ) {
    return {
      valid: false,
      error: i18n.translate('xpack.fleet.namespaceValidation.tooLongErrorMessage', {
        defaultMessage: '{type} cannot be more than 100 bytes',
        values: { type },
      }),
    };
  }

  return { valid: true };
}

export const INVALID_NAMESPACE_CHARACTERS = /[\*\\/\?"<>|\s,#:-]+/;
