/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the Elastic License 2.0, the GNU Affero General Public License
 * v3.0 only, or the Server Side Public License v 1".
 */

import { skillPiiEvaluator } from '.';
import type { EvidenceRound } from '../evidence/types';
import type { EvaluatorContext } from '../types';

const traceId = 'trace-1';
const log = { warn: jest.fn(), debug: jest.fn() } as unknown as EvaluatorContext['log'];
const trace = { traceId, esClient: {} as EvaluatorContext['trace']['esClient'] };

const round = (message: string): EvidenceRound => ({
  input: { message: 'query' },
  steps: [],
  response: { message },
});

describe('skill-pii', () => {
  it('passes clean output', async () => {
    await expect(
      skillPiiEvaluator.evaluate({ trace, round: round('All clear'), log })
    ).resolves.toEqual({
      scores: [
        {
          name: 'skill-pii',
          score: 1,
          label: 'pass',
          explanation: 'No hard-coded PII detected',
        },
      ],
    });
  });

  it('fails on an email address', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('Contact admin@contoso.internal.example for access'),
      log,
    });
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[0].label).toBe('fail');
  });

  it('allows template variables', async () => {
    await expect(
      skillPiiEvaluator.evaluate({ trace, round: round('Use {user.email} from the alert'), log })
    ).resolves.toMatchObject({
      scores: [{ score: 1, label: 'pass' }],
    });
  });
});
