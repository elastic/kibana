/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cellAgreement,
  rowAgreement,
  sequenceSimilarity,
  trailsEqual,
  trailsFromDocs,
} from './trajectory_agreement';

describe('trailsEqual / sequenceSimilarity', () => {
  it('treats identical tool_id sequences as equal', () => {
    expect(trailsEqual(['load_skill', 'search'], ['load_skill', 'search'])).toBe(true);
  });

  it('does not treat reorder as equal — order is the path', () => {
    expect(trailsEqual(['a', 'b'], ['b', 'a'])).toBe(false);
  });

  it('reports 1 for two empty trails and 0 for empty vs non-empty', () => {
    expect(sequenceSimilarity([], [])).toBe(1);
    expect(sequenceSimilarity([], ['a'])).toBe(0);
  });

  it('scores a shared prefix below 1', () => {
    const sim = sequenceSimilarity(['a', 'b', 'c'], ['a', 'b', 'd']);
    expect(sim).toBeCloseTo(0.666, 2);
  });
});

describe('cellAgreement', () => {
  it('marks a single trail unmeasured, not 0 and not 1', () => {
    expect(cellAgreement([['a']])).toEqual({ status: 'unmeasured', repetitions: 1 });
    expect(cellAgreement([])).toEqual({ status: 'unmeasured', repetitions: 0 });
  });

  it('reports identicalRate 1 when every pair matches', () => {
    const a = cellAgreement([
      ['load_skill', 'search'],
      ['load_skill', 'search'],
      ['load_skill', 'search'],
    ]);
    expect(a.status).toBe('measured');
    expect(a.identicalRate).toBe(1);
    expect(a.sequenceSimilarity).toBe(1);
  });

  it('reports identicalRate 0 when no pair matches, even if similar', () => {
    const a = cellAgreement([['generate_workflow'], ['sml_search', 'discover_apis']]);
    expect(a.identicalRate).toBe(0);
    expect(a.sequenceSimilarity).toBeLessThan(1);
  });
});

describe('trailsFromDocs', () => {
  const step = (toolId: string) => ({ type: 'tool_call', tool_id: toolId });

  it('keeps one trail per repetition_index, first doc wins', () => {
    const trails = trailsFromDocs([
      { task: { repetition_index: 0, output: { steps: [step('a'), step('b')] } } },
      // same rep, different evaluator — must not become a second trail
      { task: { repetition_index: 0, output: { steps: [step('a'), step('b')] } } },
      { task: { repetition_index: 1, output: { steps: [step('a')] } } },
    ]);
    expect(trails).toEqual([['a', 'b'], ['a']]);
  });

  it('never keys on tool_call_id — only tool_id is collected', () => {
    const trails = trailsFromDocs([
      {
        task: {
          repetition_index: 0,
          output: {
            steps: [{ type: 'tool_call', tool_id: 'search', tool_call_id: 'toolu_AAA' } as never],
          },
        },
      },
      {
        task: {
          repetition_index: 1,
          output: {
            steps: [{ type: 'tool_call', tool_id: 'search', tool_call_id: 'toolu_BBB' } as never],
          },
        },
      },
    ]);
    expect(trails).toEqual([['search'], ['search']]);
    expect(cellAgreement(trails).identicalRate).toBe(1);
  });
});

describe('rowAgreement', () => {
  it('stays unmeasured when every cell is a single rep', () => {
    const row = rowAgreement(
      [
        { model: 'opus', example: 'a', trails: [['x']] },
        { model: 'opus', example: 'b', trails: [['y']] },
      ],
      'opus'
    );
    expect(row.status).toBe('unmeasured');
    expect(row.identicalRate).toBeUndefined();
    expect(row.measuredCells).toBe(0);
  });

  it('averages only measured cells and ignores other models', () => {
    const row = rowAgreement(
      [
        {
          model: 'opus',
          example: 'a',
          trails: [['x'], ['x']],
        },
        {
          model: 'opus',
          example: 'b',
          trails: [['y'], ['z']],
        },
        { model: 'gpt', example: 'a', trails: [['x'], ['x']] },
      ],
      'opus'
    );
    expect(row.status).toBe('measured');
    expect(row.measuredCells).toBe(2);
    expect(row.identicalRate).toBe(0.5);
  });
});
