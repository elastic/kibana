/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { CasesActionContextProps, Services } from './types';
import { ADD_TO_EXISTING_CASE_DISPLAYNAME } from './translations';

export const ACTION_ID = 'embeddable_addToExistingCase';

export const createAddToExistingCaseLensAction = (
  casesActionContextProps: CasesActionContextProps,
  services: Services
) => {
  let currentAppId: string | undefined;

  services.core.application?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<EmbeddableApiContext>({
    id: ACTION_ID,
    type: 'actionButton',
    order: 10,
    grouping: [{ id: 'cases', order: 6 }],
    getIconType: () => 'casesApp',
    getDisplayName: () => ADD_TO_EXISTING_CASE_DISPLAYNAME,
    isCompatible: async ({ embeddable }) => {
      const { isCompatible } = await import('./is_compatible');
      return isCompatible(embeddable, currentAppId, services.core);
    },
    execute: async ({ embeddable }) => {
      const { isLensApi } = await import('@kbn/lens-plugin/public');
      if (!isLensApi(embeddable)) throw new IncompatibleActionError();
      const { openModal } = await import('./open_modal');
      openModal(embeddable, currentAppId, casesActionContextProps, services);
    },
  });
};
