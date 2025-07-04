/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@kbn/ui-actions-plugin/public';
import { ACTION_CONVERT_TO_LENS } from '@kbn/visualizations-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import { APP_ID } from '../../common/constants';
import type { VisualizeEditorContext } from '../types';

export const convertToLensActionFactory =
  (id: string, displayName: string, originatingApp: string) => (application: ApplicationStart) =>
    createAction<{ [key: string]: VisualizeEditorContext }>({
      type: ACTION_CONVERT_TO_LENS,
      id,
      getDisplayName: () => displayName,
      isCompatible: async () => !!application.capabilities.visualize_v2.show,
      execute: async (context: { [key: string]: VisualizeEditorContext }) => {
        const table = Object.values(context.layers);
        const payload = {
          ...context,
          layers: table,
          isVisualizeAction: true,
        };
        application.navigateToApp(APP_ID, {
          state: {
            type: ACTION_CONVERT_TO_LENS,
            payload,
            originatingApp,
          },
        });
      },
    });
