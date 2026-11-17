/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import type { FilterableSource } from '@kbn/data-source';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

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
