/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDisplayValue } from '@elastic/isomer-sdk';

import { oneLine } from '../../lib';
import type { FieldsNode } from './fields';

/** Each item's label and value, as one line of plain text each. */
export const fieldEntries = ({ items }: FieldsNode): Array<{ label: string; value: string }> =>
  items.map(({ label, value }) => ({
    label: oneLine(label),
    value: oneLine(formatDisplayValue(value)),
  }));
