/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isClearable } from './job_audit_messages';

const supportedNotificationIndices = [
  '.ml-notifications-000002',
  '.ml-notifications-000003',
  '.ml-notifications-000004',
];

const unsupportedIndices = ['.ml-notifications-000001', 'index-does-not-exist'];

describe('jobAuditMessages - isClearable', () => {
  it('should return true for indices ending in a six digit number with the last number >= 2', () => {
    supportedNotificationIndices.forEach((index) => {
      expect(isClearable(index)).toEqual(true);
    });
  });

  it('should return false for indices not ending in a six digit number with the last number >= 2', () => {
    unsupportedIndices.forEach((index) => {
      expect(isClearable(index)).toEqual(false);
    });
  });

  it('should return false for empty string or missing argument', () => {
    expect(isClearable('')).toEqual(false);
    expect(isClearable()).toEqual(false);
  });
});
