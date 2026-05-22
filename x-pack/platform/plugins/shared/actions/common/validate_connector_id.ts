/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnsafeId, isValidId } from '@kbn/human-readable-id';
import { CONNECTOR_ID_MAX_LENGTH } from '.';

export function validateConnectorId(value: string): void {
  if (isUnsafeId(value, CONNECTOR_ID_MAX_LENGTH)) {
    if (value.length === 0) {
      throw new Error('Connector ID is required.');
    }
    if (value.length > CONNECTOR_ID_MAX_LENGTH) {
      throw new Error(
        `Connector ID must be ${CONNECTOR_ID_MAX_LENGTH} characters or less (received ${value.length}).`
      );
    }
    throw new Error(
      'Connector ID must not contain path separators ("/") or traversal sequences ("..").'
    );
  }
  if (!isValidId(value, CONNECTOR_ID_MAX_LENGTH, 1)) {
    throw new Error('Connector ID must contain only lowercase letters, numbers, and hyphens.');
  }
}
