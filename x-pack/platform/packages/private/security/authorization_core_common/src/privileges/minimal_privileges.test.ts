/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMinimalPrivilegeId, isMinimalPrivilegeId } from '../..';

describe('Minimal privileges', () => {
  it('#isMinimalPrivilegeId correctly detects minimal privileges', () => {
    expect(isMinimalPrivilegeId('minimal_all')).toBe(true);
    expect(isMinimalPrivilegeId('minimal_read')).toBe(true);

    for (const privilege of ['all', 'read', 'none', 'custom', 'minimal_custom', 'minimal_none']) {
      expect(isMinimalPrivilegeId(privilege)).toBe(false);
    }
  });

  it('#getMinimalPrivilegeId correctly constructs minimal privilege ID', () => {
    expect(getMinimalPrivilegeId('all')).toBe('minimal_all');
    expect(getMinimalPrivilegeId('minimal_all')).toBe('minimal_all');

    expect(getMinimalPrivilegeId('read')).toBe('minimal_read');
    expect(getMinimalPrivilegeId('minimal_read')).toBe('minimal_read');

    expect(() => getMinimalPrivilegeId('none')).toThrowErrorMatchingInlineSnapshot(
      `"Minimal privileges are only available for \\"read\\" and \\"all\\" privileges, but \\"none\\" was provided."`
    );
    expect(() => getMinimalPrivilegeId('custom')).toThrowErrorMatchingInlineSnapshot(
      `"Minimal privileges are only available for \\"read\\" and \\"all\\" privileges, but \\"custom\\" was provided."`
    );
    expect(() => getMinimalPrivilegeId('minimal_none')).toThrowErrorMatchingInlineSnapshot(
      `"Minimal privileges are only available for \\"read\\" and \\"all\\" privileges, but \\"minimal_none\\" was provided."`
    );
    expect(() => getMinimalPrivilegeId('minimal_custom')).toThrowErrorMatchingInlineSnapshot(
      `"Minimal privileges are only available for \\"read\\" and \\"all\\" privileges, but \\"minimal_custom\\" was provided."`
    );
  });
});
