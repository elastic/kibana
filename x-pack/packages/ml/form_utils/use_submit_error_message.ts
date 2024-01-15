/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { State } from './form_slice';

const createSelectSubmitErrorMessage =
  <FF extends string, FS extends string, VN extends string, S extends State<FF, FS, VN>>(
    stateAccessor: string
  ) =>
  (s: Record<string, S>) =>
    s[stateAccessor].submitErrorMessage;

export const useSubmitErrorMessage = (stateAccessor: string) => {
  const selectSubmitErrorMessage = useMemo(
    () => createSelectSubmitErrorMessage(stateAccessor),
    [stateAccessor]
  );
  return useSelector(selectSubmitErrorMessage);
};
