/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiTableSelectionType } from '@elastic/eui';

interface UseAttachmentSelectionArgs<T> {
  items: T[];
  getId: (item: T) => string;
  enabled: boolean;
}

interface UseAttachmentSelection<T> {
  selection?: EuiTableSelectionType<T>;
  selectedIds: string[];
  clearSelection: () => void;
}

/** Row selection for an attachment table, used to remove the selected rows in bulk. */
export const useAttachmentSelection = <T>({
  items,
  getId,
  enabled,
}: UseAttachmentSelectionArgs<T>): UseAttachmentSelection<T> => {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  // Forgets hidden ids, so they don't come back checked when the search clears.
  useEffect(() => {
    setSelectedIds((previous) => {
      const displayedIds = new Set(items.map(getId));
      const next = new Set([...previous].filter((id) => displayedIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [items, getId]);

  const selected = useMemo(
    () => items.filter((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId]
  );

  const selectedRowIds = useMemo(() => selected.map(getId), [selected, getId]);

  const onSelectionChange = useCallback(
    (selectedItems: T[]) => setSelectedIds(new Set(selectedItems.map(getId))),
    [getId]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selection = useMemo<EuiTableSelectionType<T> | undefined>(
    () => (enabled ? { selected, onSelectionChange } : undefined),
    [enabled, selected, onSelectionChange]
  );

  return { selection, selectedIds: selectedRowIds, clearSelection };
};
