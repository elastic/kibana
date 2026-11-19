/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type {
  EuiContextMenuPanelItemDescriptorEntry,
  EuiContextMenuPanelItemSeparator,
  EuiContextMenuPanelItemRenderCustom,
} from '@elastic/eui/src/components/context_menu/context_menu';

type PanelTreeItem =
  | (Omit<EuiContextMenuPanelItemDescriptorEntry, 'panel'> & {
      panel?: PanelTree | number;
    })
  | EuiContextMenuPanelItemSeparator
  | EuiContextMenuPanelItemRenderCustom;

type PanelTree = Omit<EuiContextMenuPanelDescriptor, 'items'> & { items?: PanelTreeItem[] };
type FlattenedPanelTreeItem =
  | EuiContextMenuPanelItemDescriptorEntry
  | EuiContextMenuPanelItemSeparator
  | EuiContextMenuPanelItemRenderCustom;

const isEntryItem = (
  item: PanelTreeItem
): item is Omit<EuiContextMenuPanelItemDescriptorEntry, 'panel'> & {
  panel?: PanelTree | number;
} => {
  return 'name' in item && !('renderItem' in item);
};

export const flattenPanelTree = (
  tree: PanelTree,
  array: EuiContextMenuPanelDescriptor[] = []
): EuiContextMenuPanelDescriptor[] => {
  const items = tree.items?.map((item): FlattenedPanelTreeItem => {
    if (isEntryItem(item)) {
      if (item.panel && typeof item.panel !== 'number') {
        flattenPanelTree(item.panel, array);
      }

      const panel = typeof item.panel === 'number' ? item.panel : item.panel?.id;
      return { ...item, panel };
    }
    return item;
  });

  const { items: _items, ...panel } = tree;
  array.push(items ? { ...panel, items } : panel);

  return array;
};
