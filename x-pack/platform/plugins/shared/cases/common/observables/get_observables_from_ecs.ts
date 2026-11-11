/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { castArray } from 'lodash';
import type { ObservablePost } from '../types/api';
import { AUTO_EXTRACT_OBSERVABLE_DESCRIPTION } from '../constants/observables';
import type { DefaultObservableType } from './default_observable_types';
import { DEFAULT_OBSERVABLE_TYPES } from './default_observable_types';

export const getIPType = (ip: string): 'IPV4' | 'IPV6' => {
  if (ip.includes(':')) {
    return 'IPV6';
  }
  return 'IPV4';
};

export type Maybe<T> = T | null;
export interface FlattedEcsData {
  field: string;
  value?: Maybe<string[]>;
}

interface ExtractionRule {
  typeKey: string;
  valuePattern?: RegExp;
  excludedValues: ReadonlySet<string>;
}

// A value pattern is a regular expression of a user. It never runs on a longer value.
export const MAX_VALUE_LENGTH_FOR_PATTERN = 1024;

export const processObservable = (
  observablesMap: Map<string, ObservablePost>,
  value: string,
  typeKey: string,
  description: string
) => {
  const key = `${typeKey}-${value}`;
  if (observablesMap.has(key)) {
    return;
  }
  observablesMap.set(key, {
    typeKey,
    value,
    description,
  });
};

const compilePattern = (valuePattern: string): RegExp | null => {
  try {
    return new RegExp(valuePattern);
  } catch {
    return null;
  }
};

const getRulesByPath = (
  observableTypes: Readonly<Record<string, DefaultObservableType>>
): Map<string, ExtractionRule[]> => {
  const rulesByPath = new Map<string, ExtractionRule[]>();

  for (const { key, paths, valuePattern } of Object.values(observableTypes)) {
    const compiledPattern = valuePattern === undefined ? undefined : compilePattern(valuePattern);

    // A pattern that does not compile skips its type.
    if (compiledPattern !== null) {
      for (const { path, excludedValues = [] } of paths.filter(({ enabled }) => enabled)) {
        const rule: ExtractionRule = {
          typeKey: key,
          valuePattern: compiledPattern,
          excludedValues: new Set(excludedValues),
        };
        rulesByPath.set(path, [...(rulesByPath.get(path) ?? []), rule]);
      }
    }
  }

  return rulesByPath;
};

const matchesPattern = (valuePattern: RegExp | undefined, value: string): boolean =>
  !valuePattern || (value.length <= MAX_VALUE_LENGTH_FOR_PATTERN && valuePattern.test(value));

// helper function to get observables from array of flattened ECS data
export const getObservablesFromEcs = (
  ecsDataArray: FlattedEcsData[][],
  observableTypes: Readonly<Record<string, DefaultObservableType>> = DEFAULT_OBSERVABLE_TYPES
): ObservablePost[] => {
  const observablesMap = new Map<string, ObservablePost>();

  const description = i18n.translate('xpack.cases.caseView.observables.autoExtract.description', {
    defaultMessage: AUTO_EXTRACT_OBSERVABLE_DESCRIPTION,
  });
  const rulesByPath = getRulesByPath(observableTypes);

  for (const ecsData of ecsDataArray) {
    for (const { field, value } of ecsData) {
      const rules = rulesByPath.get(field) ?? [];
      const items = value ? castArray(value).filter(Boolean) : [];

      for (const item of items) {
        for (const { typeKey, valuePattern, excludedValues } of rules) {
          if (!excludedValues.has(item) && matchesPattern(valuePattern, item)) {
            processObservable(observablesMap, item, typeKey, description);
          }
        }
      }
    }
  }

  // remove duplicates of key type and value pairs
  return Array.from(observablesMap.values());
};
