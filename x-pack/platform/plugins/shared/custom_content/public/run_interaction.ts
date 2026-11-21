/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import type { FilterableSource } from '@kbn/data-source';
import { assertNever } from '@kbn/std';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type {
  CustomContentInteraction,
  CustomContentInteractionAction,
} from '@kbn/custom-content-renderer';
import { applyFilterInteraction } from './apply_filter_interaction';

/** What the panel offers an interaction to act on. Add to it when an action needs more. */
export interface InteractionHost {
  /** What the panel's queries read (data views or ES|QL datasets), once resolved. */
  dataSources: readonly FilterableSource[] | undefined;
  /** The dashboard's filters, to reuse a filter that is already there. */
  filterManager: FilterManager;
  uiActions: UiActionsStart;
  /** The panel's own API, passed along as the source of what the action does. */
  embeddable: unknown;
}

/** The actions this host runs. Narrow it here to offer a host fewer than the renderer can read. */
export const SUPPORTED_INTERACTION_ACTIONS: readonly CustomContentInteractionAction[] = ['filter'];

/**
 * Runs what a click asked for. The `switch` is exhaustive on purpose: a new member of
 * `CustomContentInteraction` fails to compile here until it has a handler.
 */
export const runInteraction = async (
  interaction: CustomContentInteraction,
  host: InteractionHost
): Promise<void> => {
  // Switching on an alias narrows `interaction` in each case, and leaves `action` as `never` in the
  // default, whether the union has one member or many.
  const { action } = interaction;
  switch (action) {
    case 'filter':
      return applyFilterInteraction(interaction, host);
    default:
      return assertNever(action);
  }
};
