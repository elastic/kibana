/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBaseOptions } from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { DEFAULT_SPACE_NAMESPACE } from './default_space_namespace';

export function getNamespace(
  operationOptions: SavedObjectsBaseOptions,
  currentSpaceId: string
): string | undefined {
  if (operationOptions.namespace) {
    if (operationOptions.namespace === DEFAULT_SPACE_NAMESPACE) {
      return undefined;
    }

    if (typeof operationOptions.namespace !== 'string') {
      throw new TypeError(
        `unable to determine namespace from ${String(
          operationOptions.namespace
        )}. Expected string but found ${typeof operationOptions.namespace}`
      );
    }

    return operationOptions.namespace;
  }
  if (currentSpaceId === DEFAULT_SPACE_ID) {
    return undefined;
  }
  return currentSpaceId;
}
