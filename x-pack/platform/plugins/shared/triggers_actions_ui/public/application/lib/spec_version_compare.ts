/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Highest accepted latest across majors. */
export const newestMajorTarget = (
  specVersions: Record<string, string> | undefined
): string | undefined => {
  if (specVersions === undefined) {
    return undefined;
  }
  const majors = Object.keys(specVersions)
    .map((key) => Number(key))
    .filter((major) => Number.isInteger(major))
    .sort((left, right) => right - left);
  if (majors.length === 0) {
    return undefined;
  }
  return specVersions[String(majors[0])];
};

export const majorOf = (version: string): number => {
  const [major] = version.split('.');
  return Number(major);
};

export const compareSpecVersions = (left: string, right: string): number => {
  const [leftMajor, leftMinor = 0] = left.split('.').map(Number);
  const [rightMajor, rightMinor = 0] = right.split('.').map(Number);
  return leftMajor - rightMajor || leftMinor - rightMinor;
};

export const isSameMajor = (pin: string, target: string): boolean =>
  majorOf(pin) === majorOf(target);
