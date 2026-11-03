/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getReturnUrl, saveReturnUrl } from './return_url';

describe('return url', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns undefined when nothing was saved', () => {
    expect(getReturnUrl('aws')).toBeUndefined();
  });

  it('returns a saved same-origin url', () => {
    const url = `${window.location.origin}/app/integrations/browse?q=aws`;
    saveReturnUrl('aws', url);
    expect(getReturnUrl('aws')).toBe(url);
  });

  it('returns a saved relative url', () => {
    saveReturnUrl('aws', '/app/integrations/browse');
    expect(getReturnUrl('aws')).toBe('/app/integrations/browse');
  });

  it('keeps the url per integration', () => {
    saveReturnUrl('aws', '/app/integrations/browse');
    expect(getReturnUrl('azure')).toBeUndefined();
  });

  it('ignores a url pointing to another origin', () => {
    saveReturnUrl('aws', 'https://example.com/phishing');
    expect(getReturnUrl('aws')).toBeUndefined();
  });
});
