/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { ReverseCategorizeFieldContext } from '@kbn/ml-ui-actions';
import { ACTION_REVERSE_CATEGORIZE_FIELD } from '@kbn/ml-ui-actions/src/aiops/ui_actions';
import type { AiopsCoreSetup } from '../../types';

export const createReverseCategorizeFieldAction = (
  getStartServices: AiopsCoreSetup['getStartServices']
) =>
  createAction<ReverseCategorizeFieldContext>({
    type: ACTION_REVERSE_CATEGORIZE_FIELD,
    id: ACTION_REVERSE_CATEGORIZE_FIELD,
    getDisplayName: () =>
      i18n.translate('xpack.aiops.reverseCategorizeFieldAction.displayName', {
        defaultMessage: 'Reverse categorization',
      }),
    isCompatible: async ({ field }: ReverseCategorizeFieldContext) => {
      return field.esTypes?.includes('text') === true;
    },
    execute: async (context: ReverseCategorizeFieldContext) => {
      const { field, dataView, fieldValue, originatingApp, openInNewTab } = context;
      const [[coreStart, pluginStart], { showReverseCategorizeFieldFlyout }] = await Promise.all([
        getStartServices(),
        import('./show_reverse_flyout'),
      ]);
      showReverseCategorizeFieldFlyout(
        field,
        dataView,
        fieldValue,
        coreStart,
        pluginStart,
        originatingApp,
        openInNewTab
      );
    },
  });
