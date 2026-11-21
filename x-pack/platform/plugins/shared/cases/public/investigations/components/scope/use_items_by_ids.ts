/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InvestigationItem, ItemKind } from '../../../../common/investigations/types';
import { useItems } from '../../hooks';

const MAX_IDS = 100;

/** Looks up a handful of items (up to 100) by id, for refs and titles next to a reference. */
export const useItemsByIds = (
  recordId: string,
  kind: ItemKind,
  ids: readonly string[]
): { itemsById: ReadonlyMap<string, InvestigationItem>; isLoading: boolean } => {
  const uniqueIds = useMemo(() => Array.from(new Set(ids)).slice(0, MAX_IDS), [ids]);
  const { data, isLoading } = useItems(
    recordId,
    { kind: [kind], ids: uniqueIds, per_page: MAX_IDS },
    { enabled: uniqueIds.length > 0 }
  );
  const itemsById = useMemo(
    () => new Map((data?.items ?? []).map((item) => [item.id, item])),
    [data]
  );
  return { itemsById, isLoading: uniqueIds.length > 0 && isLoading };
};
