/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWorkflowPrefix, getToolPrefix } from './data_source_prefixes';

describe('getToolPrefix', () => {
  it('produces name.type', () => {
    expect(getToolPrefix('SPO_connect', 'sharepoint-online')).toBe('spo_connect.sharepoint-online');
  });

  it('handles names with spaces', () => {
    expect(getToolPrefix('Random Thoughts', 'github')).toBe('random-thoughts.github');
  });

  it('propagates the error from slugify for invalid names', () => {
    expect(() => getToolPrefix('!!!', 'github')).toThrow(
      'must contain at least one alphanumeric character'
    );
  });
});

describe('getWorkflowPrefix', () => {
  it('produces name.type.source', () => {
    expect(getWorkflowPrefix('SPO_connect', 'sharepoint-online')).toBe(
      'spo_connect.sharepoint-online.source'
    );
  });

  it('handles names with spaces', () => {
    expect(getWorkflowPrefix('Random Thoughts', 'github')).toBe('random-thoughts.github.source');
  });

  it('extends the tool prefix with .source', () => {
    const toolPrefix = getToolPrefix('my-source', 'github');
    expect(getWorkflowPrefix('my-source', 'github')).toBe(`${toolPrefix}.source`);
  });

  it('propagates the error from slugify for invalid names', () => {
    expect(() => getWorkflowPrefix('!!!', 'github')).toThrow(
      'must contain at least one alphanumeric character'
    );
  });
});
