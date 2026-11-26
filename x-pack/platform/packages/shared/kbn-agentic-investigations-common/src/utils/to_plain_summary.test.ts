/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstParagraph, toPlainSummary } from './to_plain_summary';

describe('toPlainSummary', () => {
  describe('time tags', () => {
    const NOW = new Date('2026-11-26T17:20:00Z').getTime();
    let originalNow: () => number;

    beforeEach(() => {
      originalNow = Date.now;
      Date.now = () => NOW;
    });

    afterEach(() => {
      Date.now = originalNow;
    });

    it.each([
      '<time datetime="2026-11-24T17:20:00Z"></time>',
      '<time datetime="2026-11-24T17:20:00Z"/>',
      '<time datetime="2026-11-24T17:20:00Z">17:20Z</time>',
    ])('replaces %s with a relative time', (tag) => {
      expect(toPlainSummary(`Jumped at ${tag} and **ended** later.`)).toBe(
        'Jumped at 2 days ago and ended later.'
      );
    });

    it('keeps the inner text of a tag with a bad datetime, else its raw text', () => {
      expect(toPlainSummary('At <time datetime="soon">noon</time> sharp')).toBe('At noon sharp');
      expect(toPlainSummary('At <time datetime="soon"></time> sharp')).toBe(
        'At <time datetime="soon"></time> sharp'
      );
    });
  });

  it('removes emphasis and joins paragraphs on one line', () => {
    expect(toPlainSummary('AlertZero found a gap in **Payroll rule**.\n\nReview it _now_.')).toBe(
      'AlertZero found a gap in Payroll rule. Review it now.'
    );
  });

  it('unwraps inline code, keeping underscores inside it', () => {
    expect(toPlainSummary('`jdoe` ran `schtasks.exe` on `web_srv_01`.')).toBe(
      'jdoe ran schtasks.exe on web_srv_01.'
    );
  });

  it('keeps underscores inside names that are not wrapped in backticks', () => {
    expect(toPlainSummary('User svc_backup_01 logged in from web_srv_01, then _paused_.')).toBe(
      'User svc_backup_01 logged in from web_srv_01, then paused.'
    );
  });

  it('removes list and heading markers', () => {
    expect(toPlainSummary('# Title\n- one\n- two')).toBe('Title one two');
  });

  it('leaves plain text unchanged', () => {
    expect(toPlainSummary('Okta rule fired for the admin.')).toBe('Okta rule fired for the admin.');
  });
});

describe('firstParagraph', () => {
  it('returns the text before the first blank line', () => {
    expect(firstParagraph('First.\n\nSecond.')).toBe('First.');
  });

  it('ignores leading blank lines', () => {
    expect(firstParagraph('\n\nFirst.\n\nSecond.')).toBe('First.');
  });

  it('returns a single paragraph whole', () => {
    expect(firstParagraph('Only one.')).toBe('Only one.');
  });
});
