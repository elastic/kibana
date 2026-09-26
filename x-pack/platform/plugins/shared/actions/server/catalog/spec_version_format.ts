/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SPEC_VERSION_MAX_LENGTH = 16;

const EXACT_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAJOR_REQUEST_PATTERN = /^(0|[1-9]\d*)$/;
const REQUEST_PATTERN = /^(0|[1-9]\d*)(\.(0|[1-9]\d*))?$/;

export interface ParsedSpecVersion {
  major: number;
  minor: number;
}

export const isExactVersion = (value: string): boolean => EXACT_VERSION_PATTERN.test(value);

export const isMajorRequest = (value: string): boolean => MAJOR_REQUEST_PATTERN.test(value);

export const parseSpecVersion = (value: string): ParsedSpecVersion => {
  if (!isExactVersion(value)) {
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

export const majorOf = (version: string): number => parseSpecVersion(version).major;

export const validateSpecVersionRequest = (value: string): string | undefined =>
  REQUEST_PATTERN.test(value) ? undefined : 'spec version must be N or N.M';

export const validateExactSpecVersion = (value: string): string | undefined =>
  isExactVersion(value) ? undefined : 'spec version must use the MAJOR.MINOR form';
