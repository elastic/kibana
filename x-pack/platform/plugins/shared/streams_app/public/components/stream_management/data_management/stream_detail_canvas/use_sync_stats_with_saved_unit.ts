/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { collectUnitComponentIds } from '@kbn/streams-schema';
import { useStatsUnitPersisted } from '../../../unit_stats/state_management/use_stats_manager';
import { useCanvasPersistedUnit } from './state_management';

/**
 * Tells the stats manager when the saved unit changes, so it drops the components that are no
 * longer in it. The stats describe the deployed unit, so only a load or a save counts, never an
 * unsaved edit. It needs both the canvas provider and the stats provider.
 */
export const useSyncStatsWithSavedUnit = () => {
  const savedUnit = useCanvasPersistedUnit();
  const notifyUnitPersisted = useStatsUnitPersisted();
  const previousUnit = useRef(savedUnit);

  useEffect(() => {
    if (previousUnit.current === savedUnit) return;

    previousUnit.current = savedUnit;
    notifyUnitPersisted(collectUnitComponentIds(savedUnit.unit));
  }, [savedUnit, notifyUnitPersisted]);
};
