/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SPEC_VERSION_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export interface ParsedSpecVersion {
  major: number;
  minor: number;
}

export const parseSpecVersion = (value: string): ParsedSpecVersion => {
  if (!SPEC_VERSION_REGEX.test(value)) {
    throw new Error(`spec version must use the MAJOR.MINOR form: "${value}"`);
  }
  const [major, minor] = value.split('.').map((part) => Number(part));
  return { major, minor };
};

export const compareSpecVersions = (a: string, b: string): number => {
  const left = parseSpecVersion(a);
  const right = parseSpecVersion(b);
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  return left.minor - right.minor;
};
