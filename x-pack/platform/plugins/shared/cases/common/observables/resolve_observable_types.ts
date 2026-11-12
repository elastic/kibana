/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABLE_TYPES_BUILTIN_KEYS } from '../constants/observables';
import type { DefaultObservableType, ObservableTypePath } from './default_observable_types';

export interface StoredObservableType {
  key: string;
  label?: string;
  paths?: ObservableTypePath[];
  valuePattern?: string;
}

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
 * Merges the built-in types with the stored observable types into the types that extraction uses.
 */
export const resolveObservableTypes = (
  defaultTypes: Readonly<Record<string, DefaultObservableType>>,
  storedTypes: readonly StoredObservableType[]
): Record<string, DefaultObservableType> => {
  const resolvedTypes: Record<string, DefaultObservableType> = { ...defaultTypes };

  for (const { key, label, paths = [], valuePattern } of storedTypes) {
    const defaultType = defaultTypes[key];

    resolvedTypes[key] = defaultType
      ? { ...defaultType, paths: mergePaths(defaultType.paths, paths) }
      : { key, label: label ?? key, paths, valuePattern };
  }

  return resolvedTypes;
};

const hasSameExcludedValues = (
  first: readonly string[] = [],
  second: readonly string[] = []
): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index]);

/**
 * Returns the override that stores only the paths that differ from the defaults of a built-in type.
 */
export const toBuiltinOverride = (
  defaultType: DefaultObservableType,
  paths: readonly ObservableTypePath[]
): StoredObservableType | undefined => {
  const defaultsByPath = new Map(defaultType.paths.map((entry) => [entry.path, entry]));
  const changedPaths = paths.filter(({ path, enabled, excludedValues }) => {
    const defaultEntry = defaultsByPath.get(path);

    return (
      defaultEntry === undefined ||
      defaultEntry.enabled !== enabled ||
      !hasSameExcludedValues(defaultEntry.excludedValues, excludedValues)
    );
  });

  return changedPaths.length > 0 ? { key: defaultType.key, paths: changedPaths } : undefined;
};

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
