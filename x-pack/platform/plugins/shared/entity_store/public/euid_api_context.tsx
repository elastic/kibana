/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { EntityStoreEuidApi } from '../common/euid_helpers';

export type { NonEcsTimelineDataRow } from '../common/domain/euid/non_ecs_timeline_data';
export type { EntityStoreEuid, EntityStoreEuidApi } from '../common/euid_helpers';

const EntityStoreEuidApiContext = createContext<EntityStoreEuidApi | null>(null);

export function EntityStoreEuidApiProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [api, setApi] = useState<EntityStoreEuidApi | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('./euid_browser').then((mod) => {
      if (!cancelled) {
        setApi({
          euid: mod.euid,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EntityStoreEuidApiContext.Provider value={api}>{children}</EntityStoreEuidApiContext.Provider>
  );
}

export function useEntityStoreEuidApi(): EntityStoreEuidApi | null {
  return useContext(EntityStoreEuidApiContext);
}
