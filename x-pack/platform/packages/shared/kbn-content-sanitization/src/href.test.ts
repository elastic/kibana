/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFragmentId } from './href';

describe('getFragmentId', () => {
  it('returns the id of a same-document reference', () => {
    expect(getFragmentId('#shape')).toBe('shape');
    expect(getFragmentId('#a.b-c_d:e')).toBe('a.b-c_d:e');
    expect(getFragmentId('#café')).toBe('café');
    expect(getFragmentId('##')).toBe('#');
  });

  it('returns undefined for an empty fragment', () => {
    expect(getFragmentId('#')).toBeUndefined();
    expect(getFragmentId('')).toBeUndefined();
  });

  it('returns undefined for references to other documents', () => {
    for (const value of [
      'shape',
      'icon.svg#shape',
      'https://evil.com/icon.svg#shape',
      '//evil.com/icon.svg#shape',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'javascript:alert(1)', // eslint-disable-line no-script-url
    ]) {
      expect(getFragmentId(value)).toBeUndefined();
    }
  });

  it('returns undefined when the browser could resolve a different id', () => {
    for (const value of [' #shape', '#shape ', '#sh ape', '#sh\tape', '\n#shape', '#a%2Eb', '#%']) {
      expect(getFragmentId(value)).toBeUndefined();
    }
  });
});
