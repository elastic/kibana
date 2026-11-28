/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObservableTypeConfiguration,
  ObservableTypeSettingConfiguration,
} from '../types/domain';
import type { DefaultObservableType, ObservableTypePath } from './default_observable_types';

const mergePaths = (
  defaultPaths: readonly ObservableTypePath[],
  storedPaths: readonly ObservableTypePath[]
): ObservableTypePath[] => {
  const storedByPath = new Map(storedPaths.map((entry) => [entry.path, entry]));
  const defaultPathNames = new Set(defaultPaths.map(({ path }) => path));

  return [
    ...defaultPaths.map((entry) => storedByPath.get(entry.path) ?? entry),
    ...storedPaths.filter(({ path }) => !defaultPathNames.has(path)),
  ];
};

/**
 * Merges the built-in types, the custom types, and the settings of both into the types that extraction uses.
 */
export const resolveObservableTypes = (
  defaultTypes: Readonly<Record<string, DefaultObservableType>>,
  customTypes: readonly ObservableTypeConfiguration[],
  settings: readonly ObservableTypeSettingConfiguration[]
): Record<string, DefaultObservableType> => {
  // Keys of custom types are free text. Without a prototype, a key such as `__proto__` is an ordinary key.
  const resolvedTypes: Record<string, DefaultObservableType> = Object.assign(
    Object.create(null),
    defaultTypes
  );
  const isBuiltinKey = (key: string) => Object.hasOwn(defaultTypes, key);

  for (const { key, label } of customTypes) {
    if (!isBuiltinKey(key)) {
      resolvedTypes[key] = { key, label, paths: [] };
    }
  }

  // A settings entry without a built-in or custom type is left over from a deleted custom type. It is ignored.
  for (const { key, paths = [], valuePattern } of settings) {
    if (isBuiltinKey(key)) {
      resolvedTypes[key] = {
        ...defaultTypes[key],
        paths: mergePaths(defaultTypes[key].paths, paths),
      };
    } else if (Object.hasOwn(resolvedTypes, key)) {
      resolvedTypes[key] = { ...resolvedTypes[key], paths, valuePattern };
    }
  }

  return resolvedTypes;
};
