/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiHasDynamicActions,
  type HasDynamicActions,
} from '@kbn/embeddable-enhanced-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { i18n } from '@kbn/i18n';
import type { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { type PresentationContainer } from '@kbn/presentation-containers';
import { openLazyFlyout } from '@kbn/presentation-util';
import {
  apiCanAccessViewMode,
  apiHasParentApi,
  apiHasSupportedTriggers,
  apiIsOfType,
  getInheritedViewMode,
  type CanAccessViewMode,
  type EmbeddableApiContext,
  type HasUniqueId,
  type HasParentApi,
  type HasSupportedTriggers,
  type HasType,
  apiHasUniqueId,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React from 'react';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { StartDependencies } from '../../../../plugin';
import {
  createDrilldownTemplatesFromSiblings,
  DRILLDOWN_ACTION_GROUP,
  ensureNestedTriggers,
} from '../drilldown_shared';
import { coreServices, uiActionsEnhancedServices } from '../../../kibana_services';

export const OPEN_FLYOUT_ADD_DRILLDOWN = 'OPEN_FLYOUT_ADD_DRILLDOWN';

export interface OpenFlyoutAddDrilldownParams {
  start: StartServicesGetter<Pick<StartDependencies, 'uiActionsEnhanced'>>;
}

export type FlyoutCreateDrilldownActionApi = CanAccessViewMode &
  Required<HasDynamicActions> &
  HasParentApi<HasType & Partial<PresentationContainer>> &
  HasSupportedTriggers &
  Partial<HasUniqueId>;

const isApiCompatible = (api: unknown | null): api is FlyoutCreateDrilldownActionApi =>
  apiHasDynamicActions(api) &&
  apiHasParentApi(api) &&
  apiCanAccessViewMode(api) &&
  apiHasSupportedTriggers(api);

export const flyoutCreateDrilldownAction: ActionDefinition<EmbeddableApiContext> = {
  id: OPEN_FLYOUT_ADD_DRILLDOWN,
  type: OPEN_FLYOUT_ADD_DRILLDOWN,
  order: 12,
  getIconType: () => 'plusInCircle',
  grouping: [DRILLDOWN_ACTION_GROUP],
  getDisplayName: () =>
    i18n.translate('xpack.dashboard.FlyoutCreateDrilldownAction.displayName', {
      defaultMessage: 'Create drilldown',
    }),
  isCompatible: async ({ embeddable }) => {
    if (!isApiCompatible(embeddable)) return false;
    if (
      getInheritedViewMode(embeddable) !== 'edit' ||
      !apiIsOfType(embeddable.parentApi, 'dashboard')
    )
      return false;

    const supportedTriggers = [CONTEXT_MENU_TRIGGER, ...embeddable.supportedTriggers()];

    /**
     * Check if there is an intersection between all registered drilldowns possible triggers that they could be attached to
     * and triggers that current embeddable supports
     */
    const allPossibleTriggers = uiActionsEnhancedServices
      .getActionFactories()
      .map((factory) => (factory.isCompatibleLicense() ? factory.supportedTriggers() : []))
      .reduce((res, next) => res.concat(next), []);

    return ensureNestedTriggers(supportedTriggers).some((trigger) =>
      allPossibleTriggers.includes(trigger)
    );
  },
  execute: async ({ embeddable }) => {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    openLazyFlyout({
      core: coreServices,
      parentApi: embeddable.parentApi,
      loadContent: async ({ closeFlyout }) => {
        const templates = createDrilldownTemplatesFromSiblings(embeddable);
        const triggers = [
          ...ensureNestedTriggers(embeddable.supportedTriggers()),
          CONTEXT_MENU_TRIGGER,
        ];
        return (
          <uiActionsEnhancedServices.DrilldownManager
            closeAfterCreate
            initialRoute={'/new'}
            dynamicActionManager={embeddable.enhancements.dynamicActions}
            triggers={triggers}
            placeContext={{ embeddable }}
            templates={templates}
            onClose={closeFlyout}
          />
        );
      },
      flyoutProps: {
        'data-test-subj': 'createDrilldownFlyout',
        'aria-labelledby': 'drilldownFlyoutTitleAriaId',
        focusedPanelId: apiHasUniqueId(embeddable) ? embeddable.uuid : undefined,
      },
    });
  },
};
