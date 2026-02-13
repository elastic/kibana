/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';

export interface CategorizeFieldContext {
  field: DataViewField;
  dataView: DataView;
  originatingApp: string;
  additionalFilter?: {
    from: number;
    to: number;
    field?: { name: string; value: string };
  };
  focusTrapProps?: EuiFlyoutProps['focusTrapProps'];
}

export const ACTION_CATEGORIZE_FIELD = 'ACTION_CATEGORIZE_FIELD';
