/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstParagraph, toPlainSummary } from './to_plain_summary';

describe('toPlainSummary', () => {
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
