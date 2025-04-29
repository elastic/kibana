/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDatabaseValue, getDatabaseText } from './utils';

describe('getDatabaseValue', () => {
  it('should return the value for a given database text for maxmind', () => {
    const databaseText = 'GeoIP2 City';
    const result = getDatabaseValue(databaseText, 'maxmind');
    expect(result).toBe('GeoIP2-City');
  });

  it('should return the value for a given database text for ipinfo', () => {
    const databaseText = 'Free IP to ASN';
    const result = getDatabaseValue(databaseText, 'ipinfo');
    expect(result).toBe('asn');
  });

  it('should return undefined if the database text is not found', () => {
    const databaseText = 'Unknown Database';
    const result = getDatabaseValue(databaseText);
    expect(result).toBeUndefined();
  });

  it('should return the value when no type is provided and the database text is found in any option', () => {
    const databaseText = 'ASN';
    const result = getDatabaseValue(databaseText);
    expect(result).toBe('standard_asn');
  });
});

describe('getDatabaseText', () => {
  it('should return the human-readable name for a given database value for maxmind', () => {
    const databaseValue = 'GeoIP2-City';
    const result = getDatabaseText(databaseValue, 'maxmind');
    expect(result).toBe('GeoIP2 City');
  });

  it('should return the human-readable name for a given database value for ipinfo', () => {
    const databaseValue = 'asn';
    const result = getDatabaseText(databaseValue, 'ipinfo');
    expect(result).toBe('Free IP to ASN');
  });

  it('should return undefined if the database value is not found', () => {
    const databaseValue = 'unknown-value';
    const result = getDatabaseText(databaseValue);
    expect(result).toBeUndefined();
  });

  it('should return the human-readable name when no type is provided and the value is found in any option', () => {
    const databaseValue = 'standard_location';
    const result = getDatabaseText(databaseValue);
    expect(result).toBe('IP Geolocation');
  });
});
