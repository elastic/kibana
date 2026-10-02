/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogPattern } from '../../../../../common/services/semantic_log_search/types';
import {
  MAX_RERANK_INPUT_LENGTH,
  MIN_RERANK_INPUT_LENGTH,
  RERANK_INPUT_TOTAL_CHAR_BUDGET,
} from '../../constants';
import { buildRerankInputs } from './rerank_input';

const candidate = (pattern: string, message?: string): LogPattern => ({
  field: 'message',
  pattern,
  count: 1,
  firstSeen: '2024-01-01T00:00:00.000Z',
  lastSeen: '2024-01-01T01:00:00.000Z',
  sample: message === undefined ? {} : { message },
});

const totalChars = (inputs: string[]) => inputs.reduce((sum, text) => sum + text.length, 0);

describe('buildRerankInputs', () => {
  it('joins the pattern and the sample message', () => {
    expect(
      buildRerankInputs([candidate('connection refused', 'connection refused to host')])
    ).toEqual(['connection refused connection refused to host']);
  });

  it('falls back to the pattern when the sample carries no message', () => {
    expect(buildRerankInputs([candidate('only a pattern')])).toEqual(['only a pattern']);
  });

  it('ignores a non-string sample message rather than stringifying it', () => {
    const withNumericMessage: LogPattern = { ...candidate('a pattern'), sample: { message: 42 } };

    expect(buildRerankInputs([withNumericMessage])).toEqual(['a pattern']);
  });

  it('returns an empty list for no candidates', () => {
    expect(buildRerankInputs([])).toEqual([]);
  });

  it('leaves every candidate untouched when the total fits the budget', () => {
    const candidates = Array.from({ length: 20 }, (_unused, index) =>
      candidate(`pattern ${index}`, 'x'.repeat(100))
    );

    const inputs = buildRerankInputs(candidates);

    expect(totalChars(inputs)).toBeLessThanOrEqual(RERANK_INPUT_TOTAL_CHAR_BUDGET);
    inputs.forEach((text, index) => {
      expect(text).toContain(`pattern ${index}`);
      expect(text).toHaveLength(`pattern ${index} `.length + 100);
    });
  });

  it('caps a single candidate at MAX_RERANK_INPUT_LENGTH, which is where the model stops reading', () => {
    const inputs = buildRerankInputs([candidate('p', 'x'.repeat(MAX_RERANK_INPUT_LENGTH + 500))]);

    expect(inputs[0]).toHaveLength(MAX_RERANK_INPUT_LENGTH);
  });

  it('keeps the total within budget when the candidates are long', () => {
    const candidates = Array.from({ length: 40 }, () =>
      candidate('p', 'x'.repeat(MAX_RERANK_INPUT_LENGTH))
    );

    expect(totalChars(buildRerankInputs(candidates))).toBeLessThanOrEqual(
      RERANK_INPUT_TOTAL_CHAR_BUDGET
    );
  });

  it('trims the long candidates and spends the surplus, leaving short ones whole', () => {
    // 30 short candidates leave most of the budget unused; the two long ones should absorb it
    // rather than every candidate being cut to an equal share.
    const short = Array.from({ length: 30 }, (_unused, index) =>
      candidate(`short ${index}`, 'y'.repeat(20))
    );
    const long = [
      candidate('long a', 'x'.repeat(MAX_RERANK_INPUT_LENGTH)),
      candidate('long b', 'x'.repeat(MAX_RERANK_INPUT_LENGTH)),
    ];
    // The 30 short candidates come to 860 characters, so 3 000 forces the two long ones to be
    // trimmed while leaving a large surplus for them to share.
    const budget = 3_000;

    const inputs = buildRerankInputs([...short, ...long], budget);

    expect(totalChars(inputs)).toBeLessThanOrEqual(budget);
    // Short candidates survive intact.
    inputs.slice(0, 30).forEach((text, index) => {
      expect(text).toBe(`short ${index} ${'y'.repeat(20)}`);
    });
    // The long ones are trimmed, and to far more than an equal 3 000 / 32 = 93 share.
    inputs.slice(30).forEach((text) => {
      expect(text.length).toBeLessThan(MAX_RERANK_INPUT_LENGTH);
      expect(text.length).toBeGreaterThan(1_000);
    });
  });

  it('never drops a candidate, however tight the budget', () => {
    const candidates = Array.from({ length: 50 }, (_unused, index) =>
      candidate(`pattern ${index}`, 'x'.repeat(500))
    );

    const inputs = buildRerankInputs(candidates, 100);

    expect(inputs).toHaveLength(50);
    expect(inputs.every((text) => text.length > 0)).toBe(true);
  });

  it('holds the per-candidate floor above the budget rather than returning fragments', () => {
    // 50 candidates against a 100-character budget would be 2 characters each. The floor wins,
    // and the budget is knowingly exceeded: a 2-character candidate cannot be ranked, and dropping
    // candidates would remove the rare patterns this feature exists to surface.
    const candidates = Array.from({ length: 50 }, () => candidate('p', 'x'.repeat(500)));

    const inputs = buildRerankInputs(candidates, 100);

    inputs.forEach((text) => expect(text).toHaveLength(MIN_RERANK_INPUT_LENGTH));
    expect(totalChars(inputs)).toBe(50 * MIN_RERANK_INPUT_LENGTH);
  });

  it('preserves candidate order, because the response is matched back by index', () => {
    const candidates = [
      candidate('first', 'x'.repeat(MAX_RERANK_INPUT_LENGTH)),
      candidate('second', 'y'.repeat(10)),
      candidate('third', 'z'.repeat(MAX_RERANK_INPUT_LENGTH)),
    ];

    const inputs = buildRerankInputs(candidates, 1_000);

    expect(inputs[0].startsWith('first')).toBe(true);
    expect(inputs[1]).toBe(`second ${'y'.repeat(10)}`);
    expect(inputs[2].startsWith('third')).toBe(true);
  });
});
