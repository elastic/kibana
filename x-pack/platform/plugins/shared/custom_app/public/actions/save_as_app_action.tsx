/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  apiHasSerializableState,
  apiIsOfType,
  apiPublishesTitle,
  getTitle,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  customContentStateSchema,
} from '@kbn/custom-content-common';
import { CUSTOM_APP_APPLICATION_ID, SAVE_AS_CUSTOM_APP_ACTION_ID } from '../../common/constants';
import { createSavedAppsClient } from '../application/saved_apps_client';
import { getServices } from '../services';
import { customContentToDocument } from '../utils/custom_content_to_document';

const displayName = i18n.translate('xpack.customApp.saveAsApp.displayName', {
  defaultMessage: 'Save as custom app',
});

const toMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ??
  (error instanceof Error ? error.message : String(error));

/**
 * A panel menu item that saves what a custom content panel shows as a custom app of its own, which
 * can then be given the rest of what an app has: filters, values, workflows and other components.
 * The panel on the dashboard is left as it is.
 */
export const getSaveAsAppAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: SAVE_AS_CUSTOM_APP_ACTION_ID,
  // Next to the other things a panel menu does with what a panel is made of.
  order: 16,
  getIconType: () => 'apps',
  getDisplayName: () => displayName,
  isCompatible: async ({ embeddable }) =>
    apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE) &&
    apiHasSerializableState(embeddable) &&
    getServices().core.application.capabilities.customApp?.save === true,
  execute: async ({ embeddable }) => {
    if (!apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)) {
      throw new IncompatibleActionError();
    }
    if (!apiHasSerializableState(embeddable)) throw new IncompatibleActionError();

    const { core } = getServices();
    const { toasts } = core.notifications;
    const failed = (error: unknown) =>
      toasts.addDanger({
        title: i18n.translate('xpack.customApp.saveAsApp.failed', {
          defaultMessage: 'The panel could not be saved as a custom app',
        }),
        text: toMessage(error),
      });

    const title =
      (apiPublishesTitle(embeddable) ? getTitle(embeddable) : undefined) ||
      i18n.translate('xpack.customApp.saveAsApp.defaultTitle', {
        defaultMessage: 'Custom content',
      });

    try {
      const state = customContentStateSchema.parse(embeddable.serializeState());
      const { id } = await createSavedAppsClient(core.http).create({
        title,
        document: customContentToDocument(state),
      });

      toasts.addSuccess({
        title: i18n.translate('xpack.customApp.saveAsApp.saved', {
          defaultMessage: 'Saved as the custom app "{title}"',
          values: { title },
        }),
        text: toMountPoint(
          <EuiButton
            size="s"
            data-test-subj="customAppSavedOpen"
            onClick={() =>
              core.application.navigateToApp(CUSTOM_APP_APPLICATION_ID, {
                path: `/view/${encodeURIComponent(id)}`,
                openInNewTab: true,
              })
            }
          >
            {i18n.translate('xpack.customApp.saveAsApp.open', { defaultMessage: 'Open app' })}
          </EuiButton>,
          core
        ),
      });
    } catch (error) {
      failed(error);
    }
  },
});
