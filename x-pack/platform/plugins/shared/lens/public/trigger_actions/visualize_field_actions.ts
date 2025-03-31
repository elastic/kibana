/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  createAction,
  ACTION_VISUALIZE_LENS_FIELD,
  VisualizeFieldContext,
} from '@kbn/ui-actions-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';

export const visualizeFieldAction = (application: ApplicationStart) =>
  createAction<VisualizeFieldContext>({
    type: ACTION_VISUALIZE_LENS_FIELD,
    id: ACTION_VISUALIZE_LENS_FIELD,
    getDisplayName: () =>
      i18n.translate('xpack.lens.discover.visualizeFieldLegend', {
        defaultMessage: 'Visualize field',
      }),
    isCompatible: async () => !!application.capabilities.visualize_v2.show,
    execute: async (context: VisualizeFieldContext) => {
      application.navigateToApp('lens', {
        state: { type: ACTION_VISUALIZE_LENS_FIELD, payload: context },
      });
    },
  });
