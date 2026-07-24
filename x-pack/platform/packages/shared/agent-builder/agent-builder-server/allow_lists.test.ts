/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinAttachment } from './allow_lists';

describe('isAllowedBuiltinAttachment', () => {
  it('returns true for listed attachment type ids', () => {
    expect(isAllowedBuiltinAttachment('text')).toBe(true);
    expect(isAllowedBuiltinAttachment('esql')).toBe(true);
    expect(isAllowedBuiltinAttachment('platform.dashboard.dashboard_state')).toBe(true);
    expect(isAllowedBuiltinAttachment('security.alert')).toBe(true);
    expect(isAllowedBuiltinAttachment('observability.service-map')).toBe(true);
  });

  it('returns false for unlisted attachment type ids', () => {
    expect(isAllowedBuiltinAttachment('not-an-attachment')).toBe(false);
    expect(isAllowedBuiltinAttachment('')).toBe(false);
    expect(isAllowedBuiltinAttachment('security.unknown')).toBe(false);
  });
});
