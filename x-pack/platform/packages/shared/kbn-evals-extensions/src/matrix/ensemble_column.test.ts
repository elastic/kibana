/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEnsembleColumn, type EnsembleCellInput } from './ensemble_column';

const cell = (
  judgeId: string,
  modelId: string,
  exampleId: string,
  score: number
): EnsembleCellInput => ({ judgeId, modelId, exampleId, score });

describe('buildEnsembleColumn', () => {
  it('averages judges and reports how far apart they were', () => {
    const column = buildEnsembleColumn([
      cell('j1', 'a', 'ex-0', 0.9),
      cell('j2', 'a', 'ex-0', 0.5),
      cell('j1', 'b', 'ex-0', 0.4),
      cell('j2', 'b', 'ex-0', 0.4),
    ]);

    const a = column.models.find((m) => m.modelId === 'a')!;
    const b = column.models.find((m) => m.modelId === 'b')!;

    expect(a.ensemble).toBeCloseTo(0.7, 6);
    // The disagreement that produced 0.7 stays visible next to it.
    expect(a.judgeSpread).toBeCloseTo(0.4, 6);
    // Judges agreed on b, so its ensemble carries no hidden conflict.
    expect(b.judgeSpread).toBeCloseTo(0, 6);
  });

  it('averages only over cells every judge graded', () => {
    // j2 never graded ex-1, where model a scores badly. Including it would let
    // a's ensemble inherit only its good cell.
    const column = buildEnsembleColumn([
      cell('j1', 'a', 'ex-0', 0.9),
      cell('j1', 'a', 'ex-1', 0.1),
      cell('j2', 'a', 'ex-0', 0.9),
    ]);

    expect(column.sharedCellCount).toBe(1);
    expect(column.models[0].cellCount).toBe(1);
    expect(column.models[0].ensemble).toBeCloseTo(0.9, 6);
  });

  it('ranks by ensemble score', () => {
    const column = buildEnsembleColumn([
      cell('j1', 'low', 'ex-0', 0.2),
      cell('j2', 'low', 'ex-0', 0.2),
      cell('j1', 'high', 'ex-0', 0.8),
      cell('j2', 'high', 'ex-0', 0.8),
    ]);

    expect(column.models.map((m) => m.modelId)).toEqual(['high', 'low']);
  });

  it('reports sqrt(N) as the expected noise reduction', () => {
    const four = ['j1', 'j2', 'j3', 'j4'].map((j) => cell(j, 'a', 'ex-0', 0.5));
    expect(buildEnsembleColumn(four).noiseReductionFactor).toBeCloseTo(2, 6);
  });

  it('refuses to call a single judge an ensemble', () => {
    expect(() => buildEnsembleColumn([cell('j1', 'a', 'ex-0', 0.5)])).toThrow(/at least 2 judges/);
  });

  it('refuses to average judges that graded disjoint cells', () => {
    expect(() =>
      buildEnsembleColumn([cell('j1', 'a', 'ex-0', 0.5), cell('j2', 'a', 'ex-9', 0.5)])
    ).toThrow(/no shared basis/);
  });

  it('keeps per-judge means so the ensemble can be audited', () => {
    const column = buildEnsembleColumn([
      cell('lenient', 'a', 'ex-0', 1),
      cell('strict', 'a', 'ex-0', 0),
    ]);

    expect(column.models[0].perJudge).toEqual({ lenient: 1, strict: 0 });
    // A 0.5 that came from total disagreement must not read like consensus.
    expect(column.models[0].judgeSpread).toBeCloseTo(1, 6);
  });
});
