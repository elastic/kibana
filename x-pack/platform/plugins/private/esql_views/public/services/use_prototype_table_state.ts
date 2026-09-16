/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getPrototypeTableState,
  setPrototypeTableState,
  subscribeToPrototypeTableState,
  type PrototypeTableState,
} from './prototype_table_state_store';

export const usePrototypeTableState = (): [
  PrototypeTableState,
  (state: PrototypeTableState) => void,
] => {
  const [state, setState] = useState<PrototypeTableState>(getPrototypeTableState);

  useEffect(() => subscribeToPrototypeTableState(setState), []);

  const updateState = useCallback((next: PrototypeTableState) => {
    setPrototypeTableState(next);
  }, []);

  return [state, updateState];
};
