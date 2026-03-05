/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWorkflowPrefix, getToolPrefix } from './data_source_prefixes';

describe('getWorkflowPrefix', () => {
  it('produces slugified-name.source.type', () => {
    expect(getWorkflowPrefix('SPO_connect', 'sharepoint-online')).toBe(
      'spo_connect.source.sharepoint-online'
    );
  });

  it('handles names with spaces', () => {
    expect(getWorkflowPrefix('Random Thoughts', 'github')).toBe('random-thoughts.source.github');
  });

  it('propagates the error from slugify for invalid names', () => {
    expect(() => getWorkflowPrefix('!!!', 'github')).toThrow(
      'must contain at least one alphanumeric character'
    );
  });
});

describe('getToolPrefix', () => {
  it('produces type.slugified-name', () => {
    expect(getToolPrefix('SPO_connect', 'sharepoint-online')).toBe('sharepoint-online.spo_connect');
  });

  it('handles names with spaces', () => {
    expect(getToolPrefix('Random Thoughts', 'github')).toBe('github.random-thoughts');
  });

  it('propagates the error from slugify for invalid names', () => {
    expect(() => getToolPrefix('!!!', 'github')).toThrow(
      'must contain at least one alphanumeric character'
    );
  });
});
