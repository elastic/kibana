/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import {
  apiCanAccessViewMode,
  apiHasSupportedTriggers,
  getInheritedViewMode,
  type CanAccessViewMode,
  type EmbeddableApiContext,
  type HasUniqueId,
  type HasParentApi,
  type HasSupportedTriggers,
  type PresentationContainer,
  apiHasUniqueId,
} from '@kbn/presentation-publishing';
import { CONTEXT_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  apiHasDynamicActions,
  type HasDynamicActions,
} from '@kbn/embeddable-enhanced-plugin/public';
import type { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { txtDisplayName } from './i18n';
import { MenuItem } from './menu_item';
import type { StartDependencies } from '../../../../plugin';
import {
  createDrilldownTemplatesFromSiblings,
  DRILLDOWN_ACTION_GROUP,
  ensureNestedTriggers,
} from '../drilldown_shared';
import { coreServices, uiActionsEnhancedServices } from '../../../kibana_services';

export const OPEN_FLYOUT_EDIT_DRILLDOWN = 'OPEN_FLYOUT_EDIT_DRILLDOWN';

export interface FlyoutEditDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export type FlyoutEditDrilldownActionApi = CanAccessViewMode &
  Required<HasDynamicActions> &
  HasParentApi<Partial<PresentationContainer>> &
  HasSupportedTriggers &
  Partial<HasUniqueId>;

const isApiCompatible = (api: unknown | null): api is FlyoutEditDrilldownActionApi =>
  apiHasDynamicActions(api) && apiCanAccessViewMode(api) && apiHasSupportedTriggers(api);

export const flyoutEditDrilldownAction: ActionDefinition<EmbeddableApiContext> = {
  id: OPEN_FLYOUT_EDIT_DRILLDOWN,
  type: OPEN_FLYOUT_EDIT_DRILLDOWN,
  order: 10,
  getIconType: () => 'list',
  grouping: [DRILLDOWN_ACTION_GROUP],
  getDisplayName: () => txtDisplayName,
  MenuItem: MenuItem as any,
  isCompatible: async ({ embeddable }) => {
    if (!isApiCompatible(embeddable) || getInheritedViewMode(embeddable) !== 'edit') return false;
    return (embeddable.dynamicActionsState$.getValue()?.dynamicActions.events ?? []).length > 0;
  },
  execute: async ({ embeddable }) => {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    openLazyFlyout({
      core: coreServices,
      parentApi: embeddable.parentApi,
      loadContent: async ({ closeFlyout }) => {
        const templates = createDrilldownTemplatesFromSiblings(embeddable);
        return (
          <uiActionsEnhancedServices.DrilldownManager
            initialRoute={'/manage'}
            dynamicActionManager={embeddable.enhancements.dynamicActions}
            triggers={[
              ...ensureNestedTriggers(embeddable.supportedTriggers()),
              CONTEXT_MENU_TRIGGER,
            ]}
            placeContext={{ embeddable }}
            templates={templates}
            onClose={closeFlyout}
          />
        );
      },
      flyoutProps: {
        'data-test-subj': 'editDrilldownFlyout',
        'aria-labelledby': 'drilldownFlyoutTitleAriaId',
        focusedPanelId: apiHasUniqueId(embeddable) ? embeddable.uuid : undefined,
      },
    });
  },
};
