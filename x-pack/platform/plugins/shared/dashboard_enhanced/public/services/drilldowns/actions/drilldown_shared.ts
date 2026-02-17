/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiIsPresentationContainer,
  type PresentationContainer,
  getTitle,
  type PublishesTitle,
  type HasUniqueId,
  type HasParentApi,
} from '@kbn/presentation-publishing';
import { apiHasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import type { UiActionsEnhancedDrilldownTemplate as DrilldownTemplate } from '@kbn/ui-actions-enhanced-plugin/public';
import {
  ON_APPLY_FILTER,
  ON_CLICK_VALUE,
  ON_SELECT_RANGE,
} from '@kbn/ui-actions-plugin/common/trigger_ids';

/**
 * We know that ON_CLICK_VALUE and ON_SELECT_RANGE are also triggering ON_APPLY_FILTER.
 * This function appends ON_APPLY_FILTER to the list of triggers if either ON_CLICK_VALUE
 * or ON_SELECT_RANGE was executed.
 *
 * TODO: this probably should be part of uiActions infrastructure,
 * but dynamic implementation of nested trigger doesn't allow to statically express such relations
 *
 * @param triggers
 */
export function ensureNestedTriggers(triggers: string[]): string[] {
  if (
    !triggers.includes(ON_APPLY_FILTER) &&
    (triggers.includes(ON_CLICK_VALUE) || triggers.includes(ON_SELECT_RANGE))
  ) {
    return [...triggers, ON_APPLY_FILTER];
  }

  return triggers;
}

/**
 * Given a dashboard panel embeddable, it will find the parent (dashboard
 * container embeddable), then iterate through all the dashboard panels and
 * generate DrilldownTemplate for each existing drilldown.
 */
export const createDrilldownTemplatesFromSiblings = (
  embeddable: Partial<HasUniqueId> & HasParentApi<Partial<PresentationContainer>>
): DrilldownTemplate[] => {
  const parentApi = embeddable.parentApi;
  if (!apiIsPresentationContainer(parentApi)) return [];

  const templates: DrilldownTemplate[] = [];
  for (const childId of Object.keys(parentApi.children$.value)) {
    const child = parentApi.children$.value[childId] as Partial<HasUniqueId & PublishesTitle>;
    if (childId === embeddable.uuid) continue;
    if (!apiHasDynamicActions(child)) continue;
    const events = child.enhancements.dynamicActions.state.get().events;

    for (const event of events) {
      const template: DrilldownTemplate = {
        id: event.eventId,
        name: event.action.name,
        icon: 'dashboardApp',
        description: getTitle(child) ?? child.uuid ?? '',
        config: event.action.config,
        factoryId: event.action.factoryId,
        triggers: event.triggers,
      };
      templates.push(template);
    }
  }

  return templates;
};

export const DRILLDOWN_ACTION_GROUP = { id: 'drilldown', order: 3 } as const;
