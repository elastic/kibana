/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';

/**
 * Equivalent to `@kbn/data-plugin/common`'s `isSerializedSearchSource`, kept local so these
 * migrations don't pull in the data plugin's full search/expressions/ES|QL dependency graph for
 * a single shape check.
 */
export function isSerializedSearchSource(
  maybeSerializedSearchSource: unknown
): maybeSerializedSearchSource is SerializedSearchSourceFields {
  return (
    typeof maybeSerializedSearchSource === 'object' &&
    maybeSerializedSearchSource !== null &&
    !Array.isArray(maybeSerializedSearchSource)
  );
}
