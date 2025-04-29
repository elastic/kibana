/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption, EuiSelectableOption } from '@elastic/eui';
import type { Aggregation, Field } from '@kbn/ml-anomaly-utils';

interface BaseOption<T> {
  label: string | React.ReactNode;
  key?: string;
  value?: string | number | string[];
  isEmpty?: boolean;
  hideTrigger?: boolean;
  'data-is-empty'?: boolean;
  'data-hide-inspect'?: boolean;
  isGroupLabelOption?: boolean;
  isGroupLabel?: boolean;
  field?: Field;
  agg?: Aggregation;
  searchableLabel?: string;
}
export type SelectableOption<T> = EuiSelectableOption<BaseOption<T>>;
export type DropDownLabel<T = string> =
  | (EuiComboBoxOptionOption & BaseOption<Aggregation>)
  | SelectableOption<T>;

export function isSelectableOption<T>(option: unknown): option is SelectableOption<T> {
  return typeof option === 'object' && option !== null && Object.hasOwn(option, 'label');
}
