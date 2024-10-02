/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import type { Field } from '@kbn/ml-anomaly-utils';

export type DropDownLabel<T = string> = EuiSelectableOption<{
  key?: string;
  label: string | React.ReactNode;
  isEmpty?: boolean;
  'data-is-empty'?: boolean;
  isGroupLabelOption?: boolean;
  isGroupLabel?: boolean;
  // @todo: refactor type to something generic
  field?: Field;
  agg?: T;
}>;
