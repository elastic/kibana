/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction } from '@elastic/eui';

export interface ContextEditorRow {
  /** Is the field is allowed to be included in the context sent to the assistant */
  allowed: boolean;
  /** Are the field's values anonymized */
  anonymized: boolean;
  /** Is the field is denied to be included in the context sent to the assistant */
  denied: boolean;
  /** The name of the field, e.g. `user.name` */
  field: string;
  /** The raw, NOT anonymized values */
  rawValues: string[];
}

export const FIELDS = {
  ACTIONS: 'actions',
  ALLOWED: 'allowed',
  ANONYMIZED: 'anonymized',
  DENIED: 'denied',
  FIELD: 'field',
  ID: 'id',
  RAW_VALUES: 'rawValues',
};

export interface SortConfig {
  sort: {
    direction: Direction;
    field: string;
  };
}

/** The `field` in the specified `list` will be added or removed, as specified by the `operation` */
export interface BatchUpdateListItem {
  field: string;
  operation: 'add' | 'remove';
  update:
    | 'allow'
    | 'allowReplacement'
    | 'defaultAllow'
    | 'defaultAllowReplacement'
    | 'deny'
    | 'denyReplacement';
}
