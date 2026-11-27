/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { EntityItem } from '../../../../common/investigations/types';
import { useUpdateItem } from '../../hooks';
import type { Point } from './scope_helpers';

const SAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 300;

/**
 * Saves dragged node positions. Moves are debounced per entity and sent one at a time per
 * entity, carrying the version returned by the previous save so quick successive drags do not
 * conflict with themselves.
 */
export const useEntityPositionSaver = (
  recordId: string,
  entities: readonly EntityItem[]
): ((entity: EntityItem, position: Point) => void) => {
  const { mutateAsync } = useUpdateItem(recordId);
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  const pending = useRef(new Map<string, Point>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlight = useRef(new Set<string>());
  const known = useRef(new Map<string, { base: string | undefined; next: string | undefined }>());

  const flush = useCallback(
    async (entityId: string): Promise<void> => {
      if (inFlight.current.has(entityId)) {
        timers.current.set(
          entityId,
          setTimeout(() => void flush(entityId), RETRY_DELAY_MS)
        );
        return;
      }
      const position = pending.current.get(entityId);
      const entity = entitiesRef.current.find((candidate) => candidate.id === entityId);
      pending.current.delete(entityId);
      timers.current.delete(entityId);
      if (!position || !entity) {
        return;
      }
      const remembered = known.current.get(entityId);
      const version =
        remembered && remembered.base === entity.version ? remembered.next : entity.version;
      if (!version) {
        return;
      }
      inFlight.current.add(entityId);
      try {
        const { item } = await mutateAsync({
          itemId: entityId,
          version,
          patch: { entity: { position: { x: Math.round(position.x), y: Math.round(position.y) } } },
        });
        known.current.set(entityId, { base: entity.version, next: item.version });
      } catch {
        // useUpdateItem already shows the error and refreshes the data.
      } finally {
        inFlight.current.delete(entityId);
      }
    },
    [mutateAsync]
  );

  useEffect(() => {
    const timersMap = timers.current;
    const pendingMap = pending.current;
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
      Array.from(pendingMap.keys()).forEach((entityId) => void flush(entityId));
    };
  }, [flush]);

  return useCallback(
    (entity: EntityItem, position: Point) => {
      pending.current.set(entity.id, position);
      const existing = timers.current.get(entity.id);
      if (existing) {
        clearTimeout(existing);
      }
      timers.current.set(
        entity.id,
        setTimeout(() => void flush(entity.id), SAVE_DELAY_MS)
      );
    },
    [flush]
  );
};
