/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal shape of the yaml module required by these utils.
 * Callers pass the actual yaml module (from static import or loadYaml()) so that
 * common code does not statically import 'yaml' and pull it into the browser bundle.
 */
export interface YamlModule {
  Document: new (data: unknown, options?: any) => { toString(): string };
  isScalar: (node: unknown) => boolean;
}

/**
 * Pair-like shape for YAML key sorting (key may be a scalar with .value).
 */
export interface YamlPairLike {
  key: { value?: unknown };
}

/**
 * Creates a YAML key sorter function based on a defined key order.
 * Keys in the order array are sorted first, in the specified order.
 * Keys not in the array are sorted after, maintaining their relative order.
 */
export function createYamlKeysSorter(
  keyOrder: string[],
  yaml: YamlModule
): (a: YamlPairLike, b: YamlPairLike) => number {
  const { isScalar } = yaml;
  return (a, b): number => {
    if (!isScalar(a.key) || !isScalar(b.key)) {
      return 0;
    }
    const keyA = a.key.value;
    const keyB = b.key.value;
    if (typeof keyA !== 'string' || typeof keyB !== 'string') {
      return 0;
    }
    const indexA = keyOrder.indexOf(keyA);
    const indexB = keyOrder.indexOf(keyB);
    if (indexA >= 0 && indexB < 0) {
      return -1;
    }

    if (indexA < 0 && indexB >= 0) {
      return 1;
    }

    return indexA - indexB;
  };
}

/**
 * Converts data to YAML string using the yaml package Document API.
 * This is the standard toYaml implementation used across Fleet.
 */
export function toYaml(data: unknown, options: unknown, yaml: YamlModule): string {
  const doc = new yaml.Document(data, options);
  return doc.toString();
}
