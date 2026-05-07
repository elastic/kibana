/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSmlMenuHighlightSearchStrings } from './sml_command_menu_highlight';

describe('getSmlMenuHighlightSearchStrings', () => {
  it('splits type/title segments for slash queries', () => {
    expect(getSmlMenuHighlightSearchStrings('visualization/my chart')).toEqual({
      type: 'visualization',
      title: 'my chart',
    });
  });

  it('uses the full string for both columns when there is no slash', () => {
    expect(getSmlMenuHighlightSearchStrings('visu')).toEqual({
      type: 'visu',
      title: 'visu',
    });
  });

  it('returns empty strings for wildcard / empty query', () => {
    expect(getSmlMenuHighlightSearchStrings('')).toEqual({ type: '', title: '' });
    expect(getSmlMenuHighlightSearchStrings('   ')).toEqual({ type: '', title: '' });
    expect(getSmlMenuHighlightSearchStrings('*')).toEqual({ type: '', title: '' });
  });

  it('passes type segment through unchanged (including trailing *)', () => {
    expect(getSmlMenuHighlightSearchStrings('visu*/test')).toEqual({
      type: 'visu*',
      title: 'test',
    });
  });

  it('uses only the first slash so extra slashes stay in the title segment', () => {
    expect(getSmlMenuHighlightSearchStrings('a/b/c')).toEqual({
      type: 'a',
      title: 'b/c',
    });
  });

  it('treats a leading slash as empty type and remainder as title', () => {
    expect(getSmlMenuHighlightSearchStrings('/foo')).toEqual({
      type: '',
      title: 'foo',
    });
  });

  it('treats a trailing slash as empty title after trim', () => {
    expect(getSmlMenuHighlightSearchStrings('foo/')).toEqual({
      type: 'foo',
      title: '',
    });
  });
});
