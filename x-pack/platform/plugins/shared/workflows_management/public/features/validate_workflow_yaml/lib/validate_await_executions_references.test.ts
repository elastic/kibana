/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LineCounter, parseDocument } from 'yaml';
import { validateAwaitExecutionsReferences } from './validate_await_executions_references';
import { buildWorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

const validate = (yaml: string) => {
  const lineCounter = new LineCounter();
  const yamlDocument = parseDocument(yaml, { lineCounter });
  return validateAwaitExecutionsReferences(
    buildWorkflowLookup(yamlDocument, lineCounter),
    lineCounter
  ).map(({ ruleId, message, startLineNumber }) => ({ ruleId, message, startLineNumber }));
};

const START_STEPS = `steps:
  - name: maybe_enrich
    type: if
    condition: 'true'
    steps:
      - name: enrich
        type: workflow.executeAsync
        with:
          workflow-id: child
  - name: fan_out
    type: parallel
    foreach: '["a", "b"]'
    steps:
      - name: scan
        type: workflow.executeAsync
        with:
          workflow-id: child
  - name: log
    type: console
    with:
      message: hi
`;

describe('validateAwaitExecutionsReferences', () => {
  it('accepts earlier steps that are or contain a workflow.executeAsync step', () => {
    expect(
      validate(`${START_STEPS}  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps: [maybe_enrich, fan_out, enrich]
`)
    ).toEqual([]);
  });

  it('flags unknown steps, later steps and steps without workflow.executeAsync on their own line', () => {
    expect(
      validate(`${START_STEPS}  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps:
        - typo
        - log
        - later
  - name: later
    type: workflow.executeAsync
    with:
      workflow-id: child
`)
    ).toEqual([
      {
        ruleId: 'unknownAwaitedStep',
        message: 'Step "typo" does not exist in this workflow.',
        startLineNumber: 26,
      },
      {
        ruleId: 'awaitedStepStartsNoExecutions',
        message:
          'Step "log" contains no workflow.executeAsync step, so it starts no executions to await.',
        startLineNumber: 27,
      },
      {
        ruleId: 'awaitedStepNotFinished',
        message: 'Step "later" runs after "join". Reference only steps that run before it.',
        startLineNumber: 28,
      },
    ]);
  });

  it('flags a step that contains the await step', () => {
    expect(
      validate(`steps:
  - name: loop
    type: foreach
    foreach: '["a"]'
    steps:
      - name: start
        type: workflow.executeAsync
        with:
          workflow-id: child
      - name: join
        type: workflow.awaitExecutions
        with:
          from-steps: [start, loop]
`)
    ).toEqual([
      {
        ruleId: 'awaitedStepNotFinished',
        message:
          'Step "loop" contains "join", so it has not finished when "join" runs. ' +
          'Await it from a step that runs after "loop".',
        startLineNumber: 13,
      },
    ]);
  });

  describe('when the steps sit in different branches', () => {
    const PARALLEL_STEPS = `steps:
  - name: split
    type: parallel
    branches:
      - name: a
        steps:
          - name: start_a
            type: workflow.executeAsync
            with:
              workflow-id: child
      - name: b
        steps:
          - name: start_b
            type: workflow.executeAsync
            with:
              workflow-id: child
          - name: join_b
            type: workflow.awaitExecutions
            with:
              from-steps: [start_a, start_b]
`;

    it('flags a step in a sibling parallel branch and accepts its own branch', () => {
      expect(validate(PARALLEL_STEPS)).toEqual([
        {
          ruleId: 'awaitedStepNotFinished',
          message:
            'Step "start_a" runs in another branch of "split", and an await only sees ' +
            'executions from its own branch. Await it after "split".',
          startLineNumber: 20,
        },
      ]);
    });

    it('accepts steps inside a parallel step from an await after it', () => {
      expect(
        validate(`${PARALLEL_STEPS}  - name: join_all
    type: workflow.awaitExecutions
    with:
      from-steps: [start_a, start_b]
`)
      ).toEqual([expect.objectContaining({ startLineNumber: 20 })]);
    });

    it.each([
      [
        'the then branch of an if, from its else branch',
        `  - name: check
    type: if
    condition: 'true'
    steps:
      - name: start
        type: workflow.executeAsync
        with:
          workflow-id: child
    else:
      - name: join
        type: workflow.awaitExecutions
        with:
          from-steps: [start]
`,
      ],
      [
        'another switch case',
        `  - name: check
    type: switch
    expression: '{{ inputs.kind }}'
    cases:
      - match: a
        steps:
          - name: start
            type: workflow.executeAsync
            with:
              workflow-id: child
      - match: b
        steps:
          - name: join
            type: workflow.awaitExecutions
            with:
              from-steps: [start]
`,
      ],
    ])('flags a step in %s', (_, steps) => {
      expect(validate(`steps:\n${steps}`)).toEqual([
        expect.objectContaining({
          ruleId: 'awaitedStepNotFinished',
          message: 'Step "start" is in another branch of "check", so it never runs before "join".',
        }),
      ]);
    });
  });

  it('does not hang when a draft step is nested under an untyped step with the same name', () => {
    expect(
      validate(`steps:
  - name: start
    steps:
      - name: start
        type: workflow.executeAsync
        with:
          workflow-id: child
  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps: [start]
`)
    ).toEqual([]);
  });

  it('ignores explicit execution IDs', () => {
    expect(
      validate(`steps:
  - name: join
    type: workflow.awaitExecutions
    with:
      execution-ids: ["{{ inputs.id }}"]
`)
    ).toEqual([]);
  });
});
