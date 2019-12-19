/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  isStoredRoleTemplate,
  isInlineRoleTemplate,
  isInvalidRoleTemplate,
} from './role_template_type';
import { RoleTemplate } from '../../../../../../common/model';

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
