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
