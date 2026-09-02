/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renders the reliability board from REAL golden verdicts and writes it to
// disk. Skips itself when the export is absent so it cannot redden CI on a
// machine without cluster access.

import fs from 'fs';
import { renderReliabilityHtml } from './render_reliability_html';
import { judgeAgreementForModel, type JudgeVerdict } from './judge_agreement';
import type { Matrix } from './build_matrix';

const FIXTURE = '/tmp/judge_verdicts.json';
const OUT = process.env.RELIABILITY_OUT ?? '/tmp/matrix.reliability.html';

const maybe = fs.existsSync(FIXTURE) ? describe : describe.skip;

maybe('reliability board over real golden verdicts', () => {
  let verdicts: JudgeVerdict[];

  beforeAll(() => {
    verdicts = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  });

  it('reproduces the independently computed Python figures', () => {
    const opus = judgeAgreementForModel(verdicts, 'anthropic-claude-4.7-opus');
    expect(opus.status).toBe('measured');
    // Python: 531 pairs, 455/531 = 85.7%, CI [82.5, 88.4]
    expect(opus.pairs).toBe(531);
    expect(opus.verdictAgreement).toBeCloseTo(455 / 531, 6);
    expect(opus.interval!.low).toBeCloseTo(0.8245, 3);
    expect(opus.interval!.high).toBeCloseTo(0.8841, 3);

    const haiku = judgeAgreementForModel(verdicts, 'anthropic-claude-4.5-haiku');
    // Python: 531 pairs, 457/531 = 86.1%
    expect(haiku.pairs).toBe(531);
    expect(haiku.verdictAgreement).toBeCloseTo(457 / 531, 6);
  });

  it('refuses to score the model only one judge covered', () => {
    const row = judgeAgreementForModel(verdicts, 'anthropic-claude-4.8-opus');
    expect(row.status).toBe('single-judge');
    expect(row.verdictAgreement).toBeUndefined();
  });

  it('agrees that Relevance is the one hotspot clearing noise on both models', () => {
    for (const id of ['anthropic-claude-4.7-opus', 'anthropic-claude-4.5-haiku']) {
      const row = judgeAgreementForModel(verdicts, id);
      const relevance = row.worstEvaluators.find((e) => e.evaluator === 'Relevance');
      expect(relevance).toBeDefined();
      expect(relevance!.interval.low).toBeGreaterThan(0.2);
    }
  });

  it('writes the board', () => {
    const ids = [...new Set(verdicts.map((v) => v.modelId))].sort();
    const matrix: Matrix = {
      columns: [],
      composites: [],
      displayColumns: [],
      overallLabel: 'Overall',
      evaluatorSaturation: [],
      proprietary: ids.map((modelId) => ({
        modelId,
        modelLabel: modelId,
        openSource: false,
        cells: {},
        overall: { kind: 'missing' as const },
        capability: { kind: 'missing' as const },
        judgedQuality: { kind: 'missing' as const },
        coverage: { covered: 0, total: 0 },
      })),
      openSource: [],
    };
    const html = renderReliabilityHtml(matrix, {}, {}, verdicts);
    fs.writeFileSync(OUT, html);
    expect(html).toContain('Judge agreement');
    expect(html).toContain('85.7%');
    expect(html).toContain('Single judge');
  });
});
