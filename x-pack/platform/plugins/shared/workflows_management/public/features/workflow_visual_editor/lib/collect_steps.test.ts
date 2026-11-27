/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { collectStepsByName } from './collect_steps';

const workflowOf = (steps: unknown[]): WorkflowYaml =>
  ({ version: '1', name: 'w', enabled: true, triggers: [], steps } as unknown as WorkflowYaml);

const leaf = (name: string, message = 'x') => ({ name, type: 'console', with: { message } });

describe('collectStepsByName', () => {
  it('is empty without a workflow or steps', () => {
    expect(collectStepsByName(undefined).size).toBe(0);
    expect(collectStepsByName(workflowOf([])).size).toBe(0);
  });

  it('keys top-level steps by name', () => {
    const byName = collectStepsByName(workflowOf([leaf('a'), leaf('b')]));
    expect([...byName.keys()]).toEqual(['a', 'b']);
    expect(byName.get('a')).toMatchObject({ type: 'console' });
  });

  it('finds steps in nested bodies and in the on-failure fallback', () => {
    const byName = collectStepsByName(
      workflowOf([
        {
          name: 'gate',
          type: 'if',
          condition: 'x',
          steps: [leaf('yes')],
          else: [leaf('no')],
          'on-failure': { fallback: [leaf('recover')] },
        },
      ])
    );
    expect([...byName.keys()].sort()).toEqual(['gate', 'no', 'recover', 'yes']);
  });

  it('does not mistake an object inside a step payload for a step', () => {
    const byName = collectStepsByName(
      workflowOf([
        {
          name: 'call_api',
          type: 'http',
          with: { url: 'https://example.test', body: { name: 'imposter', type: 'console' } },
        },
        leaf('real'),
      ])
    );
    expect([...byName.keys()]).toEqual(['call_api', 'real']);
    expect(byName.has('imposter')).toBe(false);
  });

  it('does not let a payload object replace the real step of the same name', () => {
    const byName = collectStepsByName(
      workflowOf([
        { name: 'first', type: 'http', with: { body: { name: 'second', type: 'bogus' } } },
        leaf('second', 'the real one'),
      ])
    );
    expect(byName.get('second')).toMatchObject({ type: 'console' });
  });
});
