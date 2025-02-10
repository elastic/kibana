/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isInlineRoleTemplate,
  isInvalidRoleTemplate,
  isStoredRoleTemplate,
} from './role_template_type';
import type { RoleTemplate } from '../../../../../common';

describe('#isStoredRoleTemplate', () => {
  it('returns true for stored templates, false otherwise', () => {
    expect(isStoredRoleTemplate({ template: { id: '' } })).toEqual(true);
    expect(isStoredRoleTemplate({ template: { source: '' } })).toEqual(false);
    expect(isStoredRoleTemplate({ template: 'asdf' })).toEqual(false);
    expect(isStoredRoleTemplate({} as RoleTemplate)).toEqual(false);
  });
});

describe('#isInlineRoleTemplate', () => {
  it('returns true for inline templates, false otherwise', () => {
    expect(isInlineRoleTemplate({ template: { source: '' } })).toEqual(true);
    expect(isInlineRoleTemplate({ template: { id: '' } })).toEqual(false);
    expect(isInlineRoleTemplate({ template: 'asdf' })).toEqual(false);
    expect(isInlineRoleTemplate({} as RoleTemplate)).toEqual(false);
  });
});

describe('#isInvalidRoleTemplate', () => {
  it('returns true for invalid templates, false otherwise', () => {
    expect(isInvalidRoleTemplate({ template: 'asdf' })).toEqual(true);
    expect(isInvalidRoleTemplate({} as RoleTemplate)).toEqual(true);
    expect(isInvalidRoleTemplate({ template: { source: '' } })).toEqual(false);
    expect(isInvalidRoleTemplate({ template: { id: '' } })).toEqual(false);
  });
});
