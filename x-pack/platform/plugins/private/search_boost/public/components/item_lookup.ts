/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import useLatest from 'react-use/lib/useLatest';
import type { ContentListItem } from '@kbn/content-list-provider';

export const toItemsById = <T extends ContentListItem>(items: T[]): ReadonlyMap<string, T> =>
  new Map(items.map((item) => [item.id, item]));

/** Finds the typed item behind a table row. */
export const createItemLookup = <T extends ContentListItem>() => {
  const ItemsContext = createContext<ReadonlyMap<string, T>>(new Map());

  const useItemLookup = () => {
    // Content List keeps the first render's cell renderers, so they read the latest items.
    const itemsById = useLatest(useContext(ItemsContext));
    return (item: ContentListItem) => itemsById.current.get(item.id);
  };

  return { ItemsProvider: ItemsContext.Provider, useItemLookup };
};
