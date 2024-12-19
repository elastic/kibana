/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

function parseJsonOrDefault<Obj>(value: string | null, defaultValue: Obj): Obj {
  if (!value) {
    return defaultValue;
  }
  try {
    return JSON.parse(value) as Obj;
  } catch (e) {
    return defaultValue;
  }
}

export function useStateWithLocalStorage<State>(
  key: string,
  defaultState: State
): [State, Dispatch<SetStateAction<State>>] {
  const storageState = localStorage.getItem(key);
  const [state, setState] = useState<State>(parseJsonOrDefault<State>(storageState, defaultState));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState];
}
