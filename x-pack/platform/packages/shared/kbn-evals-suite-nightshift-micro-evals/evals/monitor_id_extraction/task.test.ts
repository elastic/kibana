/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { runTask } from './task';
import { BASE_SYSTEM_PROMPT, NO_LIST_SUFFIX, WITH_LIST_SUFFIX } from './prompt';

describe('monitor reference target', () => {
  it('sends the user message verbatim with the no-list prompt and trims the structured ID', async () => {
    const output = jest.fn().mockResolvedValue({ output: { monitor_id: '  SYN-123\n' } });
    expect(await runTask({ output }, { user_message: '  synthetic alert\n' })).toEqual({
      monitor_id: 'SYN-123',
    });
    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        system: BASE_SYSTEM_PROMPT + NO_LIST_SUFFIX,
        input: '  synthetic alert\n',
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            monitor_id: expect.objectContaining({
              type: 'string',
              description: expect.stringContaining('Jira project key'),
            }),
          }),
        }),
      })
    );
  });

  it('assembles identical tables from pair and object monitors', async () => {
    const output = jest.fn().mockResolvedValue({ output: { monitor_id: '123' } });
    await runTask(
      { output },
      { user_message: 'Alert', existing_monitors: [['123', 'Synthetic symptom']] }
    );
    await runTask(
      { output },
      {
        user_message: 'Alert',
        existing_monitors: [{ monitor_id: '123', symptom: 'Synthetic symptom' }],
      }
    );
    expect(output.mock.calls[0][0].system).toBe(
      BASE_SYSTEM_PROMPT +
        WITH_LIST_SUFFIX.replace(
          '{monitor_id_table}',
          '| monitor_id | symptom |\n|------------|---------|\n| 123 | Synthetic symptom |'
        )
    );
    expect(output.mock.calls[1][0].system).toBe(output.mock.calls[0][0].system);
  });

  it.each([undefined, null, {}, { monitor_id: 12 }])(
    'abstains when the structured result is invalid (%p)',
    async (result) => {
      expect(
        await runTask({ output: jest.fn().mockResolvedValue({ output: result }) }, {})
      ).toEqual({ monitor_id: '' });
    }
  );

  it('records a failed inference call as an empty result with its error', async () => {
    expect(
      await runTask({ output: jest.fn().mockRejectedValue(new Error('unavailable')) }, {})
    ).toEqual({ monitor_id: '', error: 'unavailable' });
  });
});

it('matches the complete request text assembled by the pinned Python reference', async () => {
  const output = jest.fn().mockResolvedValue({ output: {} });
  await runTask({ output }, { user_message: 'Synthetic alert' });
  const request = output.mock.calls[0][0];
  // SHA-256 of Python's system + newline + human text for this synthetic input at a60f802.
  expect(
    createHash('sha256')
      .update(request.system + '\n' + request.input)
      .digest('hex')
  ).toBe('9d1db2b2c1bca13061b18428f0e4b12c42ab64afdd7befb8f96d7a0d237f4f28');
});
