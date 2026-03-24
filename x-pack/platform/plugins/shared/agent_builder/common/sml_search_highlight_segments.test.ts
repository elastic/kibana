/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSmlCommandMenuHighlightNeedles,
  normalizeSmlSegmentForEuiHighlight,
  segmentKeywordForSmlTitleHighlight,
  segmentKeywordForSmlTypeHighlight,
} from './sml_search_highlight_segments';

describe('sml_search_highlight_segments', () => {
  it('splits type/title segments for slash queries', () => {
    expect(segmentKeywordForSmlTypeHighlight('visualization/my chart')).toBe('visualization');
    expect(segmentKeywordForSmlTitleHighlight('visualization/my chart')).toBe('my chart');
  });

  it('uses the full string for both when there is no slash', () => {
    expect(segmentKeywordForSmlTypeHighlight('visu')).toBe('visu');
    expect(segmentKeywordForSmlTitleHighlight('visu')).toBe('visu');
  });

  it('returns empty needles for wildcard / empty query', () => {
    expect(getSmlCommandMenuHighlightNeedles('')).toEqual({ titleSearch: '', typeSearch: '' });
    expect(getSmlCommandMenuHighlightNeedles('   ')).toEqual({ titleSearch: '', typeSearch: '' });
    expect(getSmlCommandMenuHighlightNeedles('*')).toEqual({ titleSearch: '', typeSearch: '' });
  });

  it('strips trailing * from segments for EuiHighlight (type/title prefix wildcard)', () => {
    expect(normalizeSmlSegmentForEuiHighlight('visu*')).toBe('visu');
    expect(normalizeSmlSegmentForEuiHighlight('visu**')).toBe('visu');
    expect(getSmlCommandMenuHighlightNeedles('visu*/test')).toEqual({
      typeSearch: 'visu',
      titleSearch: 'test',
    });
  });
});
