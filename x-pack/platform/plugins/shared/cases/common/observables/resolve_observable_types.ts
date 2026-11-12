/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABLE_TYPES_BUILTIN_KEYS } from '../constants/observables';
import type { ObservableTypePath } from './default_observable_types';

export interface StoredObservableType {
  key: string;
  label?: string;
  paths?: ObservableTypePath[];
  valuePattern?: string;
}

const isBuiltinObservableTypeKey = (key: string): boolean =>
  OBSERVABLE_TYPES_BUILTIN_KEYS.includes(key);

/**
 * Returns the observable types that are not built in, without the overrides of built-in types.
 */
export const getCustomObservableTypes = <T extends StoredObservableType>(
  observableTypes: readonly T[]
): T[] => observableTypes.filter(({ key }) => !isBuiltinObservableTypeKey(key));

/**
 * Removes the label that the read path fills on the overrides of built-in types.
 */
export const toStoredObservableTypes = (
  observableTypes: readonly StoredObservableType[]
): StoredObservableType[] =>
  observableTypes.map(({ label, ...observableType }) =>
    isBuiltinObservableTypeKey(observableType.key) ? observableType : { ...observableType, label }
  );
