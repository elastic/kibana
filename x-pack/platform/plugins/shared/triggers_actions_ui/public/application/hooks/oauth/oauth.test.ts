/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripOAuthCallbackQueryParams } from './oauth';

describe('stripOAuthCallbackQueryParams', () => {
  it('removes all OAuth callback query params', () => {
    const url =
      'https://localhost:5601/app/connectors?oauth_authorization=success&connector_id=abc&auto_close=true';
    expect(stripOAuthCallbackQueryParams(url)).toBe('https://localhost:5601/app/connectors');
  });

  it('preserves non-OAuth query params', () => {
    const url =
      'https://localhost:5601/app/connectors?page=1&oauth_authorization=error&connector_id=abc';
    expect(stripOAuthCallbackQueryParams(url)).toBe('https://localhost:5601/app/connectors?page=1');
  });

  it('returns the URL unchanged when no OAuth params are present', () => {
    const url = 'https://localhost:5601/app/connectors?page=1&sort=name';
    expect(stripOAuthCallbackQueryParams(url)).toBe(url);
  });

  it('handles URLs with no query params', () => {
    const url = 'https://localhost:5601/app/connectors';
    expect(stripOAuthCallbackQueryParams(url)).toBe('https://localhost:5601/app/connectors');
  });
});
