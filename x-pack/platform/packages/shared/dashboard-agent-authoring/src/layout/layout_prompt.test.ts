/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseLayoutAnswer } from './layout_prompt';
import type { LayoutArrangement } from './types';

const arrangement: LayoutArrangement = {
  plan: 'Top level: one full-width row.',
  panels: [{ id: 'p1', x: 0, y: 0, w: 48, h: 10 }],
  sections: [{ id: 's1', y: 10, panels: [{ id: 'p2', x: 0, y: 0, w: 24, h: 6 }] }],
};

describe('parseLayoutAnswer', () => {
  it('reads the arrangement from a json code block', () => {
    const text = `Here is the layout:\n\n\`\`\`json\n${JSON.stringify(arrangement)}\n\`\`\``;

    expect(parseLayoutAnswer(text)).toEqual(arrangement);
  });

  it('reads an answer without a code block', () => {
    expect(parseLayoutAnswer(` ${JSON.stringify(arrangement)}\n`)).toEqual(arrangement);
  });

  it('throws when the answer is not valid JSON', () => {
    expect(() => parseLayoutAnswer('```json\n{"plan": "cut off\n```')).toThrow(
      /the answer is not valid JSON/
    );
  });

  it('throws when the answer does not match the format', () => {
    const answer = { ...arrangement, panels: [{ id: 'p1', x: 0, y: 0, w: 60, h: 10 }] };

    expect(() => parseLayoutAnswer(JSON.stringify(answer))).toThrow(
      /the answer does not match the format/
    );
  });
});
