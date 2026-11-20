/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  apiHasParentApi,
  apiHasUniqueId,
  apiPublishesTitle,
  getTitle,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { VIEW_CUSTOM_APP_SOURCE_ACTION_ID } from '../../common/constants';
import { apiHasCustomAppDocument } from '../has_custom_app_document';
import { getServices } from '../services';

const displayName = i18n.translate('xpack.customApp.viewSource.displayName', {
  defaultMessage: 'View source',
});

/** A panel menu item that shows what a custom app panel is made of, for debugging. */
export const getViewSourceAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: VIEW_CUSTOM_APP_SOURCE_ACTION_ID,
  // Just before Inspect, which is the other way of looking at what a panel is made of.
  order: 18,
  getIconType: () => 'code',
  getDisplayName: () => displayName,
  isCompatible: async ({ embeddable }) => apiHasCustomAppDocument(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiHasCustomAppDocument(embeddable)) throw new IncompatibleActionError();

    openLazyFlyout({
      core: getServices().core,
      parentApi: apiHasParentApi(embeddable) ? embeddable.parentApi : undefined,
      flyoutProps: {
        focusedPanelId: apiHasUniqueId(embeddable) ? embeddable.uuid : undefined,
        size: 600,
        minWidth: 320,
      },
      loadContent: async ({ ariaLabelledBy }) => {
        const { SourceFlyout } = await import('./source_flyout');
        return (
          <SourceFlyout
            document={embeddable.getDocument()}
            panelTitle={apiPublishesTitle(embeddable) ? getTitle(embeddable) : undefined}
            ariaLabelledBy={ariaLabelledBy}
          />
        );
      },
    });
  },
});
