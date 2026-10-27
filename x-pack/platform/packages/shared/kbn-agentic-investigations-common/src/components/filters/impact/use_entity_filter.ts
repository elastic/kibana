/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ImpactPill } from './impact_pills';

/**
 * Selected Impact pill for a queue page. `pills` are the entities across the whole queue.
 * A poll can drop the selected entity from them, so the selection clears itself once its pill
 * is gone.
 */
export const useEntityFilter = (pills: readonly ImpactPill[]) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const availableEntityIds = useMemo(() => new Set(pills.map((pill) => pill.entityId)), [pills]);
  const entityFilter =
    selectedEntityId !== null && availableEntityIds.has(selectedEntityId) ? selectedEntityId : null;

  useEffect(() => {
    if (selectedEntityId !== entityFilter) {
      setSelectedEntityId(entityFilter);
    }
  }, [selectedEntityId, entityFilter]);

  return { entityFilter, setEntityFilter: setSelectedEntityId };
};
