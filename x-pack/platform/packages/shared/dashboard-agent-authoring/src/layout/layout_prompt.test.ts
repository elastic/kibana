/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseLayoutAnswer } from './layout_prompt';
import type { LayoutArrangement } from './types';

const answer = JSON.stringify({
  plan: 'top: 48×10; s1: 24×6',
  panels: [['p1', 0, 0, 48, 10]],
  sections: [['s1', 10, [['p2', 0, 0, 24, 6]]]],
});

const arrangement: LayoutArrangement = {
  plan: 'top: 48×10; s1: 24×6',
  panels: [{ id: 'p1', x: 0, y: 0, w: 48, h: 10 }],
  sections: [{ id: 's1', y: 10, panels: [{ id: 'p2', x: 0, y: 0, w: 24, h: 6 }] }],
};

describe('parseLayoutAnswer', () => {
  it('reads the compact answer from a json code block into the arrangement', () => {
    const text = `Here is the layout:\n\n\`\`\`json\n${answer}\n\`\`\``;

    expect(parseLayoutAnswer(text)).toEqual(arrangement);
  });

  it('reads an answer without a code block', () => {
    expect(parseLayoutAnswer(` ${answer}\n`)).toEqual(arrangement);
  });

  it('throws when the answer is not valid JSON', () => {
    expect(() => parseLayoutAnswer('```json\n{"plan": "cut off\n```')).toThrow(
      /the answer is not valid JSON/
    );
  });

  it('throws when the answer does not match the format', () => {
    const tooWide = { plan: '', panels: [['p1', 0, 0, 60, 10]], sections: [] };

    expect(() => parseLayoutAnswer(JSON.stringify(tooWide))).toThrow(
      /the answer does not match the format/
    );
  });
});
