/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

export interface CategorizeFieldContext {
  field: DataViewField;
  dataView: DataView;
  originatingApp: string;
  additionalFilter?: {
    from: number;
    to: number;
    field?: { name: string; value: string };
  };
}

export const ACTION_CATEGORIZE_FIELD = 'ACTION_CATEGORIZE_FIELD';

export const CATEGORIZE_FIELD_TRIGGER = 'CATEGORIZE_FIELD_TRIGGER';
export const categorizeFieldTrigger: Trigger = {
  id: CATEGORIZE_FIELD_TRIGGER,
  title: i18n.translate('xpack.ml.actions.runPatternAnalysis.title', {
    defaultMessage: 'Run pattern analysis',
  }),
  description: i18n.translate('xpack.ml.actions.runPatternAnalysis.description', {
    defaultMessage: 'Triggered when user wants to run pattern analysis on a field.',
  }),
};
