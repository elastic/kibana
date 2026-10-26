/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { ImpactPill, PagedImpactPills } from './impact_pills';

/** Selected Impact pill; kept as `selectedPill` while its entity sits past the loaded pages. */
export const useEntityFilter = ({ pills, total }: Pick<PagedImpactPills, 'pills' | 'total'>) => {
  const [selected, setSelected] = useState<ImpactPill | null>(null);

  const setEntityFilter = useCallback(
    (entityId: string | null) =>
      setSelected((current) => {
        if (entityId === null) return null;
        return pills.find((pill) => pill.entityId === entityId) ?? current;
      }),
    [pills]
  );

  const isQueueEmpty = pills.length === 0 && total === 0;
  if (isQueueEmpty && selected !== null) {
    setSelected(null);
  }
  const selectedPill =
    isQueueEmpty || selected === null
      ? null
      : pills.find((pill) => pill.entityId === selected.entityId) ?? selected;

  return {
    entityFilter: selectedPill?.entityId ?? null,
    selectedPill,
    setEntityFilter,
  };
};
