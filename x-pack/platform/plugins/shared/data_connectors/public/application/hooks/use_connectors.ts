/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DUMMY_CONNECTORS } from '../../data/dummy_connectors';

// TODO: Replace with API integration when backend is ready
// This hook currently returns hardcoded dummy data
export const useConnectors = () => {
  const connectors = useMemo(() => DUMMY_CONNECTORS, []);

  const popularConnectors = useMemo(
    () => connectors.filter((c) => c.category === 'popular'),
    [connectors]
  );

  const allConnectors = useMemo(() => connectors, [connectors]);

  return {
    connectors,
    popularConnectors,
    allConnectors,
    isLoading: false,
    error: null,
  };
};
