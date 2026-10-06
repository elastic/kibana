/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ImpactFilterable } from './entity_ids';
import { impactPills } from './impact_pills';

/**
 * Selected Impact pill for a queue page. `items` are every loaded row that feeds the pills.
 * A poll or a collapsed section can drop the selected entity from them, so the selection
 * clears itself once its pill is gone.
 */
export const useEntityFilter = (items: readonly ImpactFilterable[]) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const availableEntityIds = useMemo(
    () => new Set(impactPills(items).map((pill) => pill.entityId)),
    [items]
  );
  const entityFilter =
    selectedEntityId !== null && availableEntityIds.has(selectedEntityId) ? selectedEntityId : null;

  useEffect(() => {
    if (selectedEntityId !== entityFilter) {
      setSelectedEntityId(entityFilter);
    }
  }, [selectedEntityId, entityFilter]);

  return { entityFilter, setEntityFilter: setSelectedEntityId };
};
