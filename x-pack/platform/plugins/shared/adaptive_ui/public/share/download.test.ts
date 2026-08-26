/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { downloadBlob, slugifyTitle } from './download';

describe('slugifyTitle', () => {
  it.each([
    ['Cluster health', 'cluster-health'],
    ['  Spaced   out  ', 'spaced-out'],
    ['Punctuation! (mixed) — dashes', 'punctuation-mixed-dashes'],
    ['ALL CAPS', 'all-caps'],
    ['under_scores_too', 'under-scores-too'],
  ])('slugifies %p', (title, expected) => {
    expect(slugifyTitle(title)).toBe(expected);
  });

  it.each([undefined, '', '   ', '!!!', '—'])('falls back to "view" for %p', (title) => {
    expect(slugifyTitle(title)).toBe('view');
  });

  it('truncates without a trailing hyphen', () => {
    const slug = slugifyTitle(`${'a'.repeat(63)} tail`);
    expect(slug.length).toBeLessThanOrEqual(64);
    expect(slug.endsWith('-')).toBe(false);
  });
});

// `URL.createObjectURL` is installed non-configurable/non-writable by Kibana's
// jest setup, so the download is verified through the anchor instead.
// `revokeObjectURL` is absent from jsdom; a no-op keeps the call from throwing.
if (typeof URL.revokeObjectURL !== 'function') {
  (URL as unknown as Record<string, unknown>).revokeObjectURL = jest.fn();
}

describe('downloadBlob', () => {
  it('clicks an anchor carrying the filename, then removes it', () => {
    const click = jest.fn();
    const anchor = document.createElement('a');
    anchor.click = click;
    const createElement = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) =>
        tag === 'a' ? anchor : (createElement.getMockImplementation()!(tag) as HTMLElement)
      );

    downloadBlob('body', 'cluster-health.txt', 'text/plain;charset=utf-8');

    expect(click).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('cluster-health.txt');
    expect(anchor.isConnected).toBe(false);

    createElement.mockRestore();
  });
});
