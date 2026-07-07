/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateIdFromPathname } from './get_template_id_from_pathname';

describe('getTemplateIdFromPathname', () => {
  it('extracts the template id from a create-from-template path', () => {
    expect(
      getTemplateIdFromPathname(
        '/app/management/insightsAndAlerting/triggersActions/create/template/my-template-id'
      )
    ).toBe('my-template-id');
  });

  it('decodes url-encoded template ids', () => {
    expect(getTemplateIdFromPathname('/create/template/my%20template')).toBe('my template');
  });

  it('returns undefined when the path has no template segment', () => {
    expect(
      getTemplateIdFromPathname(
        '/app/management/insightsAndAlerting/triggersActions/create/.es-query'
      )
    ).toBeUndefined();
  });

  it('stops at query params or hash', () => {
    expect(getTemplateIdFromPathname('/create/template/my-template-id?foo=bar')).toBe(
      'my-template-id'
    );
    expect(getTemplateIdFromPathname('/create/template/my-template-id#section')).toBe(
      'my-template-id'
    );
  });
});
