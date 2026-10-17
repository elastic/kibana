/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { createAction, ACTION_VISUALIZE_LENS_FIELD } from '@kbn/ui-actions-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import rison from '@kbn/rison';
import {
  storeVisualizeFieldContext,
  removeStoredVisualizeFieldContext,
} from './visualize_field_context_transfer';

export const visualizeFieldAction = (application: ApplicationStart, data: DataPublicPluginStart) =>
  createAction<VisualizeFieldContext>({
    type: ACTION_VISUALIZE_LENS_FIELD,
    id: ACTION_VISUALIZE_LENS_FIELD,
    getDisplayName: () =>
      i18n.translate('xpack.lens.discover.visualizeFieldLegend', {
        defaultMessage: 'Visualize field',
      }),
    isCompatible: async () => !!application.capabilities.visualize_v2.show,
    execute: async (context: VisualizeFieldContext) => {
      if (context.openInNewTab) {
        // history state does not survive window.open, so the context travels via
        // sessionStorage while time and global filters travel in the URL, since
        // the new tab cannot rely on the shared timefilter of the current one
        const globalState = {
          time: data.query.timefilter.timefilter.getTime(),
          filters: data.query.filterManager.getGlobalFilters(),
        };
        storeVisualizeFieldContext(context);
        await application.navigateToApp('lens', {
          path: `#/?_g=${rison.encode(globalState)}`,
          openInNewTab: true,
          skipAppLeave: true,
        });
        // window.open has already cloned sessionStorage into the new tab
        removeStoredVisualizeFieldContext();
        return;
      }
      application.navigateToApp('lens', {
        state: { type: ACTION_VISUALIZE_LENS_FIELD, payload: context },
      });
    },
  });
