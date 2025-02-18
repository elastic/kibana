/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertTimestamp } from './convert_timestamp';

describe('convert_timestamp', () => {
  const stringDate = '2024-09-06T11:10:24.681Z';
  const stringDateWithSlash = '2019/05/15';
  const stringDateWithDot = '10.12.1979';
  const anyString = 'asdfgh';
  const anyStringWithNumber = '123asdfghjkl';
  const epochDate = 1725880672;
  const stringifiedEpochDate = '1725880672';

  it('should return a string date as it is', () => {
    expect(convertTimestamp(stringDate)).toBe(stringDate);
  });

  it('should return any string as it is', () => {
    expect(convertTimestamp(anyString)).toBe(anyString);
  });

  it('should return any string date with slash as it is', () => {
    expect(convertTimestamp(stringDateWithSlash)).toBe(stringDateWithSlash);
  });

  it('should return any string date with dot as it is', () => {
    expect(convertTimestamp(stringDateWithDot)).toBe(stringDateWithDot);
  });

  it('should return any string with some numbers in it as it is', () => {
    expect(convertTimestamp(anyStringWithNumber)).toBe(anyStringWithNumber);
  });

  it('should return a number if the input is a stringified number', () => {
    expect(convertTimestamp('12345678')).toBe(12345678);
  });

  it('should return an epoch date as it is', () => {
    expect(convertTimestamp(epochDate)).toBe(epochDate);
  });

  it('should return a stringified epoch date as number', () => {
    expect(convertTimestamp(stringifiedEpochDate)).toBe(epochDate);
  });

  it('should return null if timestamp is not passed', () => {
    expect(convertTimestamp()).toBe(null);
  });

  it('should return null if timestamp is null', () => {
    expect(convertTimestamp(null)).toBe(null);
  });
});
