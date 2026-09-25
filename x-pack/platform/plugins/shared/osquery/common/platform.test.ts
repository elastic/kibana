/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_PLATFORM } from './constants';
import { isAllPlatforms, isEmptyOrAllPlatforms, platformSetsEqual } from './platform';

describe('isAllPlatforms', () => {
  it('returns false for undefined or empty', () => {
    expect(isAllPlatforms(undefined)).toBe(false);
    expect(isAllPlatforms('')).toBe(false);
  });

  it('returns true for DEFAULT_PLATFORM and any permutation', () => {
    expect(isAllPlatforms(DEFAULT_PLATFORM)).toBe(true);
    expect(isAllPlatforms('linux,darwin,windows')).toBe(true);
    expect(isAllPlatforms(' windows, linux, darwin ')).toBe(true);
  });

  it('returns false for a proper subset, including duplicate tokens of one OS', () => {
    expect(isAllPlatforms('linux')).toBe(false);
    expect(isAllPlatforms('linux,windows')).toBe(false);
    expect(isAllPlatforms('linux,linux,linux')).toBe(false);
  });

  it('returns false when an unknown token is mixed in', () => {
    expect(isAllPlatforms('linux,windows,darwin,posix')).toBe(false);
  });
});

describe('isEmptyOrAllPlatforms', () => {
  it('returns true for missing, empty, whitespace, and comma-only values', () => {
    expect(isEmptyOrAllPlatforms(undefined)).toBe(true);
    expect(isEmptyOrAllPlatforms(null)).toBe(true);
    expect(isEmptyOrAllPlatforms('')).toBe(true);
    expect(isEmptyOrAllPlatforms('  ')).toBe(true);
    expect(isEmptyOrAllPlatforms(',')).toBe(true);
    expect(isEmptyOrAllPlatforms(' , , ')).toBe(true);
  });

  it('returns true for every DEFAULT_PLATFORM permutation', () => {
    expect(isEmptyOrAllPlatforms(DEFAULT_PLATFORM)).toBe(true);
    expect(isEmptyOrAllPlatforms('windows,linux,darwin')).toBe(true);
  });

  it('returns false for a real platform restriction', () => {
    expect(isEmptyOrAllPlatforms('linux')).toBe(false);
    expect(isEmptyOrAllPlatforms('linux,windows')).toBe(false);
  });
});

describe('platformSetsEqual', () => {
  it('treats permutations of the same tokens as equal', () => {
    expect(platformSetsEqual('linux,windows', 'windows,linux')).toBe(true);
    expect(platformSetsEqual(' linux, darwin ', 'darwin,linux')).toBe(true);
  });

  it('returns false for different sets', () => {
    expect(platformSetsEqual('linux', 'windows')).toBe(false);
    expect(platformSetsEqual('linux,windows', 'linux')).toBe(false);
  });

  it('returns true when both sides are missing', () => {
    expect(platformSetsEqual(undefined, undefined)).toBe(true);
    expect(platformSetsEqual('', '')).toBe(true);
  });
});
