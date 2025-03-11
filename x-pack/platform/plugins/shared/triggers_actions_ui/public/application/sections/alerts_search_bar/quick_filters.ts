/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { EuiContextMenuPanelItemDescriptor } from '@elastic/eui/src/components/context_menu/context_menu';

type BaseContextMenuItem = Omit<EuiContextMenuPanelItemDescriptor, 'name' | 'title'>;

export interface QuickFilter extends BaseContextMenuItem {
  name: string;
  filter: Filter;
}

export interface QuickFiltersGroup extends BaseContextMenuItem {
  title: string;
  items: QuickFiltersMenuItem[];
}

export type QuickFiltersMenuItem = QuickFiltersGroup | QuickFilter;

export const isQuickFiltersGroup = (
  quickFiltersMenuItem: QuickFiltersMenuItem
): quickFiltersMenuItem is QuickFiltersGroup => 'items' in quickFiltersMenuItem;
