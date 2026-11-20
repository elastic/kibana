/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import type { LayoutArrangement, LayoutRequest } from '@kbn/dashboard-agent-authoring';
import { createLayoutArranger } from './layout_arranger';

const request: LayoutRequest = {
  panels: [{ id: 'p1', type: 'lens', chartType: 'metric', title: 'Requests' }],
  sections: [],
};

const answer = JSON.stringify({ plan: 'top: 48×6', panels: [['p1', 0, 0, 48, 6]], sections: [] });

const arrangement: LayoutArrangement = {
  plan: 'top: 48×6',
  panels: [{ id: 'p1', x: 0, y: 0, w: 48, h: 6 }],
  sections: [],
};

const createModelProvider = (texts: string[]) => {
  const invoke = jest.fn();
  texts.forEach((text) =>
    invoke.mockResolvedValueOnce({ text, usage_metadata: { output_tokens: 12 } })
  );
  const modelProvider = {
    getDefaultModel: jest.fn(async () => ({ chatModel: { invoke } })),
  } as unknown as ModelProvider;
  return { modelProvider, invoke };
};

describe('createLayoutArranger', () => {
  it('returns the arrangement of a readable answer', async () => {
    const { modelProvider, invoke } = createModelProvider([`\`\`\`json\n${answer}\n\`\`\``]);

    await expect(createLayoutArranger({ modelProvider })(request)).resolves.toEqual(arrangement);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('asks again once with the error when the answer cannot be read', async () => {
    const { modelProvider, invoke } = createModelProvider(['not json', answer]);

    await expect(createLayoutArranger({ modelProvider })(request)).resolves.toEqual(arrangement);
    expect(invoke).toHaveBeenCalledTimes(2);
    const [retryMessages] = invoke.mock.calls[1];
    expect(retryMessages.slice(2)).toEqual([
      ['ai', 'not json'],
      [
        'human',
        expect.stringContaining('Your answer could not be read: the answer is not valid JSON'),
      ],
    ]);
  });

  it('throws with the last answer when no answer can be read', async () => {
    const { modelProvider, invoke } = createModelProvider(['not json', '{"plan": ""}']);

    await expect(createLayoutArranger({ modelProvider })(request)).rejects.toThrow(
      /the answer does not match the format.*output tokens: 12/s
    );
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
