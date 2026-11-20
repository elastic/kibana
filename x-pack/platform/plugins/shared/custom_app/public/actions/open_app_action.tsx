/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { CUSTOM_APP_APPLICATION_ID, OPEN_CUSTOM_APP_ACTION_ID } from '../../common/constants';
import { apiHasCustomAppLibraryId } from '../has_library_id';
import { getServices } from '../services';

const displayName = i18n.translate('xpack.customApp.openApp.displayName', {
  defaultMessage: 'Open app',
});

/** The id of the app of the library a panel links to, for a panel that does link to one. */
const getLinkedAppId = (api: unknown): string | undefined =>
  apiHasCustomAppLibraryId(api) ? api.getLibraryId() : undefined;

/**
 * A panel menu item that opens the app a panel links to on its own page, in another tab so the
 * dashboard, and anything not saved on it, stays where it is. Only a linked panel has one.
 */
export const getOpenAppAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: OPEN_CUSTOM_APP_ACTION_ID,
  // Next to the other things a panel menu does with what a panel is made of.
  order: 17,
  getIconType: () => 'external',
  getDisplayName: () => displayName,
  isCompatible: async ({ embeddable }) =>
    getLinkedAppId(embeddable) !== undefined &&
    getServices().core.application.capabilities.customApp?.show === true,
  execute: async ({ embeddable }) => {
    const id = getLinkedAppId(embeddable);
    if (id === undefined) throw new IncompatibleActionError();

    await getServices().core.application.navigateToApp(CUSTOM_APP_APPLICATION_ID, {
      path: `/view/${encodeURIComponent(id)}`,
      openInNewTab: true,
    });
  },
});
