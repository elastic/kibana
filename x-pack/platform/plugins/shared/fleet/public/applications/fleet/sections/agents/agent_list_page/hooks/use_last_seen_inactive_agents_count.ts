/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import { useStartServices } from '../../../../../../hooks';

const LOCAL_STORAGE_KEY = 'fleet.lastSeenInactiveAgentsCount';

export const useLastSeenInactiveAgentsCount = (): [number, (val: number) => void] => {
  const { storage } = useStartServices();
  const [lastSeenInactiveAgentsCount, setLastSeenInactiveAgentsCount] = useState(0);
  useEffect(() => {
    const storageValue = storage.get(LOCAL_STORAGE_KEY);
    if (storageValue) {
      setLastSeenInactiveAgentsCount(parseInt(storageValue, 10));
    }
  }, [storage]);

  const updateLastSeenInactiveAgentsCount = (inactiveAgents: number) => {
    storage.set(LOCAL_STORAGE_KEY, inactiveAgents.toString());
    setLastSeenInactiveAgentsCount(inactiveAgents);
  };

  return [lastSeenInactiveAgentsCount, updateLastSeenInactiveAgentsCount];
};
