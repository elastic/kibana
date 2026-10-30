/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { applyWorkflowParameters, readWorkflowParameters } from './workflow_parameters';

const yaml = `version: "1"
name: Memory maintenance
consts:
  # Agents whose memories are maintained.
  agent_ids: []
  # Memories unused for this many days are forgotten.
  unused_days: 14
  # The model. Empty uses the default.
  connector_id: ""
  # What the model is told to do.
  instructions: |
    Merge duplicates.
    Remove contradicted memories.
  dry_run: false
  no_items: []
triggers:
  - type: scheduled
    with:
      every: "1d"
  - type: manual
steps:
  - name: plan
    type: ai.prompt
    with:
      prompt: "{{ consts.instructions }}"
`;

describe('readWorkflowParameters', () => {
  it('lists each const with its comment and how it is edited, and the schedule', () => {
    expect(readWorkflowParameters(yaml)).toEqual({
      parameters: [
        {
          key: 'agent_ids',
          kind: 'json',
          value: [],
          description: 'Agents whose memories are maintained.',
        },
        {
          key: 'unused_days',
          kind: 'number',
          value: 14,
          description: 'Memories unused for this many days are forgotten.',
        },
        {
          key: 'connector_id',
          kind: 'string',
          value: '',
          description: 'The model. Empty uses the default.',
        },
        {
          key: 'instructions',
          kind: 'text',
          value: 'Merge duplicates.\nRemove contradicted memories.\n',
          description: 'What the model is told to do.',
        },
        { key: 'dry_run', kind: 'boolean', value: false },
      ],
      schedule: '1d',
    });
  });

  it('reads a workflow without consts or a schedule', () => {
    expect(readWorkflowParameters('name: x\nsteps: []\n')).toEqual({ parameters: [] });
  });
});

describe('applyWorkflowParameters', () => {
  it('changes only the given values and the schedule, keeping the comments', () => {
    const updated = applyWorkflowParameters(yaml, {
      values: {
        agent_ids: ['elastic-ai-agent'],
        unused_days: 7,
        connector_id: 'my-connector',
        instructions: 'Only merge exact duplicates.\nNever remove.',
        dry_run: true,
      },
      schedule: '12h',
    });

    const definition = parse(updated);
    expect(definition.consts).toEqual({
      agent_ids: ['elastic-ai-agent'],
      unused_days: 7,
      connector_id: 'my-connector',
      instructions: 'Only merge exact duplicates.\nNever remove.',
      dry_run: true,
      no_items: [],
    });
    expect(definition.triggers[0].with.every).toBe('12h');
    expect(definition.steps).toEqual(parse(yaml).steps);
    expect(updated).toContain(
      '# Memories unused for this many days are forgotten.\n  unused_days: 7'
    );
    expect(updated).toContain('instructions: |');
  });
});
