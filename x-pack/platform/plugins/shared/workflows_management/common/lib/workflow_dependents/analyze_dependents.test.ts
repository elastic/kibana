/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertJsonSchemaToZodWithRefs } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  analyzeCalledWorkflows,
  analyzeDependents,
  analyzeRemovalImpact,
  buildDependentsIndex,
  MAX_INDIRECT_DEPTH,
} from './analyze_dependents';
import {
  collectWorkflowCallSites,
  collectWorkflowOutputBlocks,
  findOutputsPassingThrough,
  findOutputUsages,
  mayLoseImplicitOutput,
  mayRecoverFromFailure,
} from './find_call_sites';
import type { DependentsAnalysis, ImpactIssue, WorkflowLookupItem } from './types';

jest.mock('@kbn/workflows/spec/lib/build_fields_zod_validator', () => {
  const actual = jest.requireActual('@kbn/workflows/spec/lib/build_fields_zod_validator');
  return {
    ...actual,
    convertJsonSchemaToZodWithRefs: jest.fn(actual.convertJsonSchemaToZodWithRefs),
  };
});

const CHILD_ID = 'alert-context';

const makeChild = ({
  inputs = [
    { name: 'alert_id', type: 'string', required: true },
    { name: 'depth', type: 'number', default: 1 },
  ],
  outputs = [
    { name: 'severity', type: 'string' },
    { name: 'score', type: 'number' },
  ],
  emit = { severity: 'high', score: 9 },
}: {
  inputs?: Array<Record<string, unknown>>;
  outputs?: Array<Record<string, unknown>>;
  emit?: Record<string, unknown>;
} = {}) => ({
  name: 'Alert context',
  triggers: [{ type: 'manual', inputs }],
  outputs,
  steps: [{ name: 'emit', type: 'workflow.output', with: emit }],
});

const callStep = (
  name: string,
  withBlock: Record<string, unknown>,
  type = 'workflow.execute',
  workflowId = CHILD_ID
) => ({
  name,
  type,
  with: { 'workflow-id': workflowId, ...withBlock },
});

const workflow = (
  id: string,
  steps: unknown[],
  extra: Record<string, unknown> = {}
): WorkflowLookupItem => ({
  id,
  name: id,
  enabled: true,
  definition: { name: id, triggers: [{ type: 'manual' }], steps, ...extra },
});

const triage = workflow('triage', [
  callStep('ctx', { inputs: { alert_id: '{{ event.alerts[0].id }}' } }),
  { name: 'log', type: 'console', with: { message: '{{ steps.ctx.output.severity }}' } },
]);

const enrich = workflow('enrich', [
  {
    name: 'maybe',
    type: 'if',
    condition: 'true',
    steps: [callStep('lookup', { inputs: { alert_id: 'abc', depth: 'deep' } })],
  },
  { name: 'use', type: 'console', with: { message: "{{ steps['lookup'].output['score'] }}" } },
]);

const fanout = workflow('fanout', [
  callStep('fire', { inputs: '${{ inputs.payload }}' }, 'workflow.executeAsync'),
]);

const alreadyBroken = workflow('already-broken', [callStep('ctx', { inputs: {} })]);

const nightly = workflow('nightly', [
  { name: 'run-triage', type: 'workflow.execute', with: { 'workflow-id': 'triage' } },
]);

const unrelated = workflow('unrelated', [{ name: 'noop', type: 'console', with: {} }]);

const childItem = { id: CHILD_ID, name: 'Alert context', enabled: true, definition: makeChild() };

const allWorkflows = [triage, enrich, fanout, alreadyBroken, nightly, unrelated, childItem];

const index = buildDependentsIndex(CHILD_ID, allWorkflows);

const analyze = (draftDefinition: unknown) =>
  analyzeDependents({ index, savedDefinition: makeChild(), draftDefinition });

const analyzeWith = (
  workflows: WorkflowLookupItem[],
  draftDefinition: unknown,
  savedDefinition: unknown = makeChild()
) =>
  analyzeDependents({
    index: buildDependentsIndex(CHILD_ID, workflows),
    savedDefinition,
    draftDefinition,
  });

const statusById = (analysis: DependentsAnalysis) =>
  Object.fromEntries(analysis.dependents.map(({ workflowId, status }) => [workflowId, status]));

const dependentOf = (analysis: DependentsAnalysis, id: string) =>
  analysis.dependents.find(({ workflowId }) => workflowId === id);

const kinds = (issues: readonly ImpactIssue[] = []) =>
  issues.map(({ kind, severity }) => `${kind}:${severity}`);

// Removing the `severity` output breaks every workflow that reads it.
const withoutSeverity = makeChild({
  outputs: [{ name: 'score', type: 'number' }],
  emit: { score: 9 },
});

describe('collectWorkflowCallSites', () => {
  it('finds calls nested in control-flow steps and skips dynamic workflow ids', () => {
    const callSites = collectWorkflowCallSites({
      steps: [
        { name: 'a', type: 'workflow.execute', with: { 'workflow-id': '{{ inputs.id }}' } },
        {
          name: 'sw',
          type: 'switch',
          cases: [{ match: 1, steps: [callStep('b', {})] }],
          default: [callStep('c', {}, 'workflow.executeAsync')],
        },
      ],
    });
    expect(callSites.map(({ stepName, stepType }) => [stepName, stepType])).toEqual([
      ['b', 'workflow.execute'],
      ['c', 'workflow.executeAsync'],
    ]);
  });

  it('skips the malformed parts of a draft being typed', () => {
    expect(
      collectWorkflowCallSites({
        steps: [
          { name: 'half', type: 'switch' },
          { name: 'sw', type: 'switch', cases: [null, { steps: [callStep('b', {})] }] },
        ],
      }).map(({ stepName }) => stepName)
    ).toEqual(['b']);
  });

  it('finds calls in the workflow-level fallback', () => {
    expect(
      collectWorkflowCallSites({
        settings: { 'on-failure': { fallback: [callStep('on-workflow-failure', {})] } },
        steps: [callStep('always', {})],
      }).map(({ stepName }) => stepName)
    ).toEqual(['always', 'on-workflow-failure']);
  });
});

describe('findOutputUsages', () => {
  it('detects dot and bracket notation and whole-output references', () => {
    const definition = {
      steps: [
        {
          name: 'x',
          type: 'console',
          with: {
            a: '{{ steps.ctx.output.severity }}',
            b: '{{ steps["ctx"].output["score"] }}',
            c: '{{ steps.ctx.output | json }}',
            d: '{{ steps.ctx2.output.other }}',
          },
        },
      ],
    };
    expect(
      findOutputUsages(definition, 'ctx')
        .map(({ field }) => field)
        .sort()
    ).toEqual(['', 'score', 'severity']);
  });

  it('finds reads in on-failure continue conditions', () => {
    const definition = {
      steps: [
        { ...callStep('ctx', {}) },
        {
          name: 'next',
          type: 'console',
          with: { message: 'hi' },
          'on-failure': { continue: 'steps.ctx.output.severity : "high"' },
        },
        {
          name: 'again',
          type: 'console',
          with: { message: 'hi' },
          'on-failure': { retry: { 'max-attempts': 2, condition: 'steps.ctx.output.retry : *' } },
        },
      ],
      settings: { 'on-failure': { continue: 'steps.ctx.output.ignored : *' } },
    };

    expect(findOutputUsages(definition, 'ctx').map(({ field }) => field)).toEqual([
      'ignored',
      'severity',
      'retry',
    ]);
  });

  it('finds reads in iteration-on-failure conditions', () => {
    const definition = {
      steps: [
        { ...callStep('ctx', {}) },
        {
          name: 'each',
          type: 'foreach',
          foreach: '[1, 2]',
          'iteration-on-failure': {
            continue: 'steps.ctx.output.skip : *',
            retry: { 'max-attempts': 2, condition: 'steps.ctx.output.retry : *' },
          },
          steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
        },
      ],
    };

    expect(findOutputUsages(definition, 'ctx').map(({ field }) => field)).toEqual([
      'skip',
      'retry',
    ]);
  });

  it('reads KQL only where the engine evaluates a condition, not in step payloads', () => {
    const definition = {
      steps: [
        {
          name: 'post',
          type: 'http',
          with: { condition: 'steps.ctx.output.value: *', if: 'steps.ctx.output.other: *' },
        },
        { name: 'loop', type: 'foreach', foreach: '[1]', condition: 'steps.ctx.output.x: *' },
      ],
    };

    expect(findOutputUsages(definition, 'ctx')).toEqual([]);
  });

  it('treats a read as covered only when every reference has a default filter', () => {
    const usages = findOutputUsages(
      {
        steps: [
          {
            name: 'x',
            type: 'console',
            with: {
              a: '{{ steps.ctx.output.score | default: 0 }}',
              b: '{{ steps.ctx.output.severity | default: "low" }}',
              c: 'Severity: {{ steps.ctx.output.severity }}',
              d: "{% if true %}{{ steps.ctx.output.value | default: 'safe' }}{% endif %}",
              e: '{% for i in (1..2) %}{% if i %}{{ steps.ctx.output.rank | default: 1 }}{% endif %}{% endfor %}',
              f: '{% if steps.ctx.output.flag %}{{ steps.ctx.output.flag | default: 0 }}{% endif %}',
            },
          },
        ],
      },
      'ctx'
    );
    expect(usages).toEqual([
      { field: 'score', hasFallback: true },
      { field: 'severity', hasFallback: false },
      { field: 'value', hasFallback: true },
      { field: 'rank', hasFallback: true },
      { field: 'flag', hasFallback: false },
    ]);
  });

  it('reads Liquid tags, KQL conditions and the workflow-level fallback, but not plain text', () => {
    const usages = findOutputUsages(
      {
        settings: {
          'on-failure': {
            fallback: [
              { name: 'f', type: 'console', with: { m: '{{ steps.ctx.output.recovery }}' } },
            ],
          },
        },
        steps: [
          {
            name: 'x',
            type: 'console',
            if: 'steps.ctx.output.enabled : true',
            with: {
              a: "{{ steps['ctx']['output']['bracketed'] }}",
              b: '{% if steps.ctx.output.flag %}yes{% endif %}',
              c: '{% for item in steps.ctx.output.items %}{{ item.name }}{% endfor %}',
              d: 'See steps.ctx.output.documented in the docs',
            },
          },
          { name: 'branch', type: 'if', condition: 'steps.ctx.output.level : "high"', steps: [] },
        ],
      },
      'ctx'
    );

    expect(usages.map(({ field }) => field).sort()).toEqual([
      'bracketed',
      'enabled',
      'flag',
      'items',
      'level',
      'recovery',
    ]);
    expect(usages.every(({ hasFallback }) => !hasFallback)).toBe(true);
  });
});

describe('mayRecoverFromFailure', () => {
  const run = (name: string, extra: Record<string, unknown> = {}) => ({
    ...callStep(name, {}),
    ...extra,
  });

  it('reads the step’s own on-failure', () => {
    const definition = {
      steps: [
        run('plain'),
        run('continues', { 'on-failure': { continue: true } }),
        run('maybe-continues', { 'on-failure': { continue: 'inputs.lenient : true' } }),
        run('strict', { 'on-failure': { continue: false } }),
        run('falls-back', { 'on-failure': { fallback: [{ name: 'log', type: 'console' }] } }),
        run('ends-in-fallback', {
          'on-failure': { fallback: [{ name: 'done', type: 'workflow.output', with: {} }] },
        }),
        run('fails-in-fallback', {
          'on-failure': { fallback: [{ name: 'stop', type: 'workflow.fail', with: {} }] },
        }),
        run('retries', { 'on-failure': { retry: { 'max-attempts': 2 } } }),
      ],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('plain')).toBe(false);
    expect(recovers('continues')).toBe(true);
    expect(recovers('maybe-continues')).toBe(true);
    expect(recovers('strict')).toBe(false);
    // The engine fails the step again after its fallback, unless the fallback completed the run.
    expect(recovers('falls-back')).toBe(false);
    expect(recovers('ends-in-fallback')).toBe(true);
    expect(recovers('fails-in-fallback')).toBe(false);
    expect(recovers('retries')).toBe(false);
    expect(recovers('missing')).toBe(false);
  });

  it('counts loop control in a fallback only when it leaves the loop around the step', () => {
    const innerLoop = (name: string, type: string, extra: Record<string, unknown> = {}) => ({
      name,
      type: 'foreach',
      foreach: '[1]',
      steps: [{ name: `${name}-leave`, type }],
      ...extra,
    });
    const definition = {
      steps: [
        {
          name: 'outer',
          type: 'foreach',
          foreach: '[1, 2]',
          steps: [
            run('breaks', { 'on-failure': { fallback: [{ name: 'leave', type: 'loop.break' }] } }),
            ...['loop.break', 'loop.continue'].map((type) =>
              run(`in-inner-${type}`, { 'on-failure': { fallback: [innerLoop('inner', type)] } })
            ),
            run('in-inner-iteration-fallback', {
              'on-failure': {
                fallback: [
                  {
                    ...innerLoop('inner', 'console'),
                    'iteration-on-failure': { fallback: [{ name: 'leave', type: 'loop.break' }] },
                  },
                ],
              },
            }),
            run('in-inner-loop-fallback', {
              'on-failure': {
                fallback: [
                  {
                    ...innerLoop('inner', 'console'),
                    'on-failure': { fallback: [{ name: 'leave', type: 'loop.continue' }] },
                  },
                ],
              },
            }),
            run('ends-in-inner', {
              'on-failure': {
                fallback: [
                  innerLoop('inner', 'console', {
                    steps: [{ name: 'done', type: 'workflow.output', with: {} }],
                  }),
                ],
              },
            }),
          ],
        },
      ],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('breaks')).toBe(true);
    expect(recovers('in-inner-loop.break')).toBe(false);
    expect(recovers('in-inner-loop.continue')).toBe(false);
    expect(recovers('in-inner-iteration-fallback')).toBe(false);
    // A loop's own on-failure runs outside it, so its loop control leaves the outer loop.
    expect(recovers('in-inner-loop-fallback')).toBe(true);
    expect(recovers('ends-in-inner')).toBe(true);
  });

  it('reads the handlers of the steps that hold it, and the continue around a fallback', () => {
    const done = { name: 'done', type: 'workflow.output', with: {} };
    const definition = {
      steps: [
        {
          name: 'guarded',
          type: 'if',
          condition: 'true',
          'on-failure': { fallback: [run('in-fallback'), done] },
          steps: [run('inside')],
        },
        run('continues', { 'on-failure': { continue: true, fallback: [run('in-continued')] } }),
        {
          name: 'iterations',
          type: 'foreach',
          foreach: '[1]',
          'on-failure': { continue: true },
          'iteration-on-failure': { fallback: [run('in-iteration-fallback')] },
          steps: [run('body')],
        },
        {
          name: 'loop',
          type: 'foreach',
          foreach: '[1]',
          'iteration-on-failure': { continue: true },
          steps: [run('iteration')],
        },
        {
          name: 'fan',
          type: 'parallel',
          mode: 'settled',
          branches: [{ name: 'one', steps: [run('branch')] }],
        },
        {
          name: 'fail-fast',
          type: 'parallel',
          branches: [{ name: 'one', steps: [run('fast-branch')] }],
        },
      ],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('inside')).toBe(true);
    expect(recovers('in-fallback')).toBe(false);
    expect(recovers('in-continued')).toBe(true);
    expect(recovers('in-iteration-fallback')).toBe(true);
    expect(recovers('iteration')).toBe(true);
    expect(recovers('branch')).toBe(true);
    expect(recovers('fast-branch')).toBe(false);
  });

  it('applies the workflow-level handler to steps without their own, and its fallback', () => {
    const definition = {
      settings: { 'on-failure': { continue: true, fallback: [run('in-fallback')] } },
      steps: [run('plain'), run('strict', { 'on-failure': { continue: false } })],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('plain')).toBe(true);
    expect(recovers('strict')).toBe(false);
    expect(recovers('in-fallback')).toBe(true);
    expect(
      mayRecoverFromFailure(
        { settings: { 'on-failure': { fallback: [run('in-fallback')] } }, steps: [] },
        'in-fallback'
      )
    ).toBe(false);
  });
});

describe('findOutputsPassingThrough', () => {
  it('returns the workflow outputs whose values come from the given step outputs', () => {
    const definition = {
      steps: [
        callStep('ctx', {}),
        {
          name: 'out',
          type: 'workflow.output',
          with: {
            risk: '${{ steps.ctx.output.score }}',
            label: '{{ steps.ctx.output.severity }}',
            safe: '{{ steps.ctx.output.score | default: 0 }}',
            whole: '${{ steps.ctx.output }}',
          },
        },
      ],
    };
    const blocks = collectWorkflowOutputBlocks(definition);
    expect([...findOutputsPassingThrough(blocks, [{ stepName: 'ctx', field: 'score' }])]).toEqual([
      'risk',
      'whole',
    ]);
    expect([...findOutputsPassingThrough(blocks, [{ stepName: 'ctx' }])].sort()).toEqual([
      'label',
      'risk',
      'whole',
    ]);
  });
});

describe('analyzeDependents', () => {
  it('finds callers that run the workflow only from their workflow-level fallback', () => {
    const recovers = workflow('recovers', [{ name: 'noop', type: 'console', with: {} }], {
      settings: { 'on-failure': { fallback: [callStep('ctx', { inputs: { alert_id: 'a' } })] } },
    });
    const draft = makeChild({
      inputs: [
        { name: 'alert_id', type: 'string', required: true },
        { name: 'tenant', type: 'string', required: true },
      ],
    });

    expect(statusById(analyzeWith([recovers], draft))).toEqual({ recovers: 'breaking' });
    expect(analyzeRemovalImpact([CHILD_ID], [recovers]).callers).toEqual([
      { id: 'recovers', name: 'recovers' },
    ]);
  });

  it('lists direct callers with no impact when nothing changed', () => {
    const analysis = analyze(makeChild());

    expect(analysis.contractChanges).toEqual([]);
    expect(analysis.summary).toEqual({
      direct: 4,
      breaking: 0,
      warning: 0,
      unknown: 0,
      indirectBreaking: 0,
    });
    expect(analysis.dependents.every(({ upstream }) => upstream.length === 0)).toBe(true);
  });

  it('marks callers the saved version already breaks as already broken', () => {
    const brokenDependent = dependentOf(analyze(makeChild()), 'already-broken');

    expect(brokenDependent?.status).toBe('alreadyBroken');
    expect(brokenDependent?.issues).toEqual([
      expect.objectContaining({ kind: 'missingRequiredInput', field: 'alert_id', isNew: false }),
    ]);
  });

  it('flags callers that read a removed output', () => {
    const analysis = analyze(withoutSeverity);

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputRemoved', field: 'severity', severity: 'breaking' }),
    ]);
    expect(statusById(analysis)).toMatchObject({ triage: 'breaking', enrich: 'alreadyBroken' });
  });

  it('flags callers that read a declared output the workflow.output step no longer sets', () => {
    const draft = {
      ...makeChild(),
      steps: [{ name: 'emit', type: 'workflow.output', with: { severity: 'high', scor: 9 } }],
    };
    const analysis = analyze(draft);

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputNoLongerReturned', field: 'score' }),
    ]);
    expect(statusById(analysis)).toMatchObject({ triage: 'safe', enrich: 'breaking' });
    expect(dependentOf(analysis, 'enrich')?.issues).toContainEqual(
      expect.objectContaining({ kind: 'unreturnedOutput', field: 'score' })
    );
  });

  it('only warns when the workflow.output step still sets an output that is no longer declared', () => {
    const analysis = analyze(makeChild({ outputs: [{ name: 'score', type: 'number' }] }));

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputRemoved', field: 'severity', severity: 'warning' }),
    ]);
    expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual([
      'outputNoLongerDeclared:warning',
    ]);
    expect(analysis.summary.breaking).toBe(0);
  });

  it('warns callers that read outputs when no workflow.output step is left', () => {
    const analysis = analyze({
      ...makeChild(),
      steps: [{ name: 'log', type: 'console', with: { message: 'done' } }],
    });

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputStepRemoved', severity: 'warning' }),
    ]);
    expect(statusById(analysis).triage).toBe('warning');
    expect(dependentOf(analysis, 'triage')?.issues).toEqual([
      expect.objectContaining({ kind: 'outputFromLastStep', field: 'severity', isNew: true }),
    ]);
  });

  it('warns callers of an undeclared output when the last step may now return it', () => {
    const undeclaredChild = (step: Record<string, unknown>) => ({
      name: 'Alert context',
      triggers: [{ type: 'manual' }],
      steps: [{ name: 'emit', with: { severity: 'high' }, ...step }],
    });
    const analysis = analyzeWith(
      [triage, childItem],
      undeclaredChild({ type: 'data.set' }),
      undeclaredChild({ type: 'workflow.output' })
    );

    expect(statusById(analysis).triage).toBe('warning');
    expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual(['outputFromLastStep:warning']);
  });

  it('warns instead of breaking when a run can finish without the workflow.output step', () => {
    const analysis = analyze({
      ...makeChild(),
      steps: [
        {
          name: 'maybe',
          type: 'if',
          condition: 'inputs.depth > 1',
          steps: [{ name: 'emit', type: 'workflow.output', with: { score: 9 } }],
        },
      ],
    });

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputStepRemoved', severity: 'warning' }),
    ]);
    expect(statusById(analysis).triage).toBe('warning');
    expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual(['outputFromLastStep:warning']);
  });

  it('breaks callers of an output a run that can finish without workflow.output stops returning', () => {
    const emitsIfDeep = (child: ReturnType<typeof makeChild>) => ({
      ...child,
      steps: [{ name: 'maybe', type: 'if', condition: 'inputs.depth > 1', steps: child.steps }],
    });
    const saved = emitsIfDeep(makeChild());
    const analyzeDraft = (draft: unknown) => analyzeWith([triage, childItem], draft, saved);

    const dropped = analyzeDraft(emitsIfDeep(withoutSeverity));
    expect(statusById(dropped).triage).toBe('breaking');
    expect(kinds(dependentOf(dropped, 'triage')?.issues)).toEqual(['removedOutput:breaking']);

    // An output step that still sets it keeps the run that reaches it returning it.
    const undeclared = analyzeDraft(
      emitsIfDeep(makeChild({ outputs: [{ name: 'score', type: 'number' }] }))
    );
    expect(statusById(undeclared).triage).toBe('safe');

    const unchanged = analyzeDraft(saved);
    expect(statusById(unchanged).triage).toBe('safe');
    expect(kinds(dependentOf(unchanged, 'triage')?.issues)).toEqual(['outputFromLastStep:warning']);
  });

  it('still checks returned outputs when the other branch fails the run', () => {
    const analysis = analyze({
      ...makeChild(),
      steps: [
        {
          name: 'maybe',
          type: 'if',
          condition: 'inputs.depth > 1',
          steps: [{ name: 'emit', type: 'workflow.output', with: { score: 9 } }],
          else: [{ name: 'stop', type: 'workflow.fail', with: { message: 'too shallow' } }],
        },
      ],
    });

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputNoLongerReturned', field: 'severity' }),
    ]);
    expect(statusById(analysis).triage).toBe('breaking');
    expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual(['unreturnedOutput:breaking']);
  });

  it('flags callers that read the last output an undeclared workflow returns once it is gone', () => {
    const reader = workflow('reader', [
      callStep('ctx', { inputs: { alert_id: 'a' } }),
      { name: 'log', type: 'console', with: { m: '{{ steps.ctx.output.value }}' } },
    ]);
    const undeclared = (emit: Record<string, unknown>) => ({
      ...makeChild({ emit }),
      outputs: undefined,
    });
    const computed = {
      ...undeclared({}),
      steps: [{ name: 'emit', type: 'workflow.output', with: '${{ inputs.payload }}' }],
    };

    expect(
      kinds(
        dependentOf(analyzeWith([reader], undeclared({}), undeclared({ value: 1 })), 'reader')
          ?.issues
      )
    ).toEqual(['removedOutput:breaking']);
    expect(
      kinds(
        dependentOf(analyzeWith([reader], computed, undeclared({ value: 1 })), 'reader')?.issues
      )
    ).toEqual(['undeclaredOutput:warning']);
  });

  it('only warns when the removed output is read with a default value', () => {
    const reader = workflow('reader', [
      callStep('ctx', { inputs: { alert_id: 'a' } }),
      {
        name: 'log',
        type: 'console',
        with: { m: '{{ steps.ctx.output.severity | default: "-" }}' },
      },
    ]);
    const analysis = analyzeWith([reader], withoutSeverity);

    expect(kinds(dependentOf(analysis, 'reader')?.issues)).toEqual(['removedOutput:warning']);
  });

  it('breaks every caller when the workflow is turned off', () => {
    const analysis = analyze({ ...makeChild(), enabled: false });

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'disabled', severity: 'breaking' }),
    ]);
    expect(Object.values(statusById(analysis))).toEqual([
      'breaking',
      'breaking',
      'breaking',
      'breaking',
    ]);
  });

  it('flags every static caller when a new required input is added', () => {
    const analysis = analyze(
      makeChild({
        inputs: [
          { name: 'alert_id', type: 'string', required: true },
          { name: 'depth', type: 'number', default: 1 },
          { name: 'tenant', type: 'string', required: true },
        ],
      })
    );

    expect(statusById(analysis)).toEqual({
      triage: 'breaking',
      enrich: 'breaking',
      'already-broken': 'breaking',
      fanout: 'unknown',
    });
  });

  it('compiles each input schema once however many workflows call this one', () => {
    const callers = Array.from({ length: 1000 }, (_, i) =>
      workflow(`caller-${i}`, [
        callStep('ctx', { inputs: { alert_id: `alert-${i}`, depth: i % 2 === 0 ? i : `${i}` } }),
      ])
    );
    const draft = makeChild({
      inputs: [
        { name: 'alert_id', type: 'string', required: true },
        { name: 'depth', type: 'string', default: '1' },
      ],
    });
    jest.mocked(convertJsonSchemaToZodWithRefs).mockClear();

    const analysis = analyzeWith(callers, draft);

    expect(analysis.summary.direct).toBe(1000);
    expect(analysis.summary.breaking).toBe(500);
    // One per input, for the saved and the draft contract.
    expect(jest.mocked(convertJsonSchemaToZodWithRefs).mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('flags values that no longer match the input type, including text templates', () => {
    const analysis = analyze(
      makeChild({
        inputs: [
          { name: 'alert_id', type: 'number', required: true },
          { name: 'depth', type: 'number', default: 1 },
        ],
      })
    );

    expect(dependentOf(analysis, 'enrich')?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'inputTypeMismatch', field: 'alert_id', isNew: true }),
        expect.objectContaining({ kind: 'inputTypeMismatch', field: 'depth', isNew: false }),
      ])
    );
    // `{{ }}` always renders a string, which a number input rejects.
    expect(dependentOf(analysis, 'triage')?.issues).toEqual([
      expect.objectContaining({ kind: 'inputRendersAsText', severity: 'breaking', isNew: true }),
    ]);
  });

  it('warns when a passed input is no longer declared', () => {
    const analysis = analyze(
      makeChild({ inputs: [{ name: 'alert_id', type: 'string', required: true }] })
    );

    expect(statusById(analysis).enrich).toBe('warning');
    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'inputRemoved', field: 'depth', severity: 'warning' }),
    ]);
  });

  it('does not mistake built-in object properties for declared fields', () => {
    const reader = workflow('reader', [
      callStep('ctx', { inputs: { alert_id: 'a', constructor: 'x' } }),
      {
        name: 'log',
        type: 'console',
        with: { m: '{{ steps.ctx.output.constructor }} {{ steps.ctx.output.toString }}' },
      },
    ]);
    const strict = {
      ...makeChild(),
      triggers: [],
      inputs: { properties: {}, additionalProperties: false },
    };

    expect(kinds(dependentOf(analyzeWith([reader], makeChild()), 'reader')?.issues)).toEqual([
      'unknownInput:warning',
      'removedOutput:breaking',
      'removedOutput:breaking',
    ]);
    expect(
      dependentOf(analyzeWith([reader], strict), 'reader')?.issues.filter(
        ({ kind }) => kind === 'unknownInput'
      )
    ).toEqual([
      expect.objectContaining({ field: 'alert_id', severity: 'breaking' }),
      expect.objectContaining({ field: 'constructor', severity: 'breaking' }),
    ]);
    const declaresConstructor = makeChild({
      outputs: [...makeChild().outputs, { name: 'constructor', type: 'string' }],
      emit: { severity: 'high', score: 9, constructor: 'x' },
    });
    expect(analyzeWith([reader], makeChild(), declaresConstructor).contractChanges).toEqual([
      expect.objectContaining({
        kind: 'outputRemoved',
        field: 'constructor',
        severity: 'breaking',
      }),
    ]);
  });

  it('treats a reference to a built-in property of consts as a missing constant', () => {
    const caller = workflow(
      'caller',
      [callStep('ctx', { inputs: { alert_id: '${{ consts.toString }}' } })],
      {
        consts: {},
      }
    );

    expect(kinds(dependentOf(analyzeWith([caller], makeChild()), 'caller')?.issues)).toEqual([
      'missingRequiredInput:breaking',
    ]);
  });

  describe('typing', () => {
    const childWithInputs = (properties: Record<string, unknown>, extra = {}) => ({
      ...makeChild(),
      inputs: { properties, ...extra },
      triggers: [{ type: 'manual' }],
    });
    const typedCaller = (inputs: Record<string, unknown>, callerExtra = {}) =>
      workflow('caller', [callStep('ctx', { inputs })], callerExtra);
    const issuesFor = (
      inputs: Record<string, unknown>,
      draft: unknown,
      saved: unknown = draft,
      callerExtra = {}
    ) =>
      kinds(
        dependentOf(analyzeWith([typedCaller(inputs, callerExtra)], draft, saved), 'caller')?.issues
      );

    it('breaks a literal string sent to an input that became an array', () => {
      const saved = childWithInputs({ tags: { type: 'string' } });
      const draft = childWithInputs({ tags: { type: 'array', items: { type: 'string' } } });
      expect(issuesFor({ tags: 'urgent' }, draft, saved)).toEqual(['inputTypeMismatch:breaking']);
      expect(issuesFor({ tags: ['urgent'] }, draft, saved)).toEqual([]);
    });

    it('checks array items, nested objects, enums and integers like the run does', () => {
      const draft = childWithInputs({
        tags: { type: 'array', items: { type: 'string' } },
        target: {
          type: 'object',
          properties: { host: { type: 'string' } },
          required: ['host'],
        },
        level: { type: 'string', enum: ['low', 'high'] },
        count: { type: 'integer' },
      });

      expect(issuesFor({ tags: [1] }, draft)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ target: {} }, draft)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ level: 'medium' }, draft)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ count: 1.5 }, draft)).toEqual(['inputTypeMismatch:breaking']);
      expect(issuesFor({ count: 2, level: 'low', target: { host: 'a' } }, draft)).toEqual([]);
      // Nested values computed while running can't be judged.
      expect(issuesFor({ target: { host: '${{ inputs.host }}' } }, draft)).toEqual([]);
    });

    it('treats {{ }} as text and ${{ }} as typed', () => {
      const draft = childWithInputs({
        count: { type: 'number' },
        note: { type: ['string', 'null'] },
      });

      expect(issuesFor({ count: '{{ inputs.n }}' }, draft)).toEqual([
        'inputRendersAsText:breaking',
      ]);
      expect(issuesFor({ count: '${{ steps.x.output.n }}' }, draft)).toEqual([]);
      expect(issuesFor({ note: '{{ inputs.n }}' }, draft)).toEqual([]);
    });

    it('compares ${{ inputs.x }} with the type the caller declares for x', () => {
      const draft = childWithInputs({
        ids: { type: 'array' },
        n: { type: 'number' },
        s: { type: 'string' },
      });
      const callerInputs = {
        inputs: {
          properties: {
            id: { type: 'string' },
            whole: { type: 'integer' },
            maybe: { type: ['string', 'null'] },
          },
          required: ['id'],
        },
      };

      expect(issuesFor({ ids: '${{ inputs.id }}' }, draft, draft, callerInputs)).toEqual([
        'inputTypeMismatch:breaking',
      ]);
      expect(issuesFor({ n: '${{ inputs.whole }}' }, draft, draft, callerInputs)).toEqual([]);
      expect(issuesFor({ s: '${{ inputs.maybe }}' }, draft, draft, callerInputs)).toEqual([
        'inputTypeMismatch:warning',
      ]);
    });

    it('warns when an input the caller passes on gets stricter than its type', () => {
      const saved = childWithInputs({ n: { type: 'number' } });
      const draft = childWithInputs({ n: { type: 'number', minimum: 10 } });
      const callerInputs = { inputs: { properties: { n: { type: 'number' } } } };

      expect(issuesFor({ n: '${{ inputs.n }}' }, draft, saved, callerInputs)).toEqual([
        'inputSchemaChanged:warning',
      ]);
      expect(issuesFor({ n: '${{ inputs.n }}' }, draft, draft, callerInputs)).toEqual([]);
    });

    it('fills in defaults like the run does before reporting a missing input', () => {
      const saved = childWithInputs({});
      const draftWith = (value: Record<string, unknown>, extra = {}) =>
        childWithInputs({ value }, { required: ['value'], ...extra });

      expect(issuesFor({}, draftWith({ type: 'array', items: { type: 'string' } }), saved)).toEqual(
        []
      );
      expect(
        issuesFor(
          {},
          draftWith({
            type: 'object',
            properties: { size: { type: 'number', default: 10 } },
            required: ['size'],
          }),
          saved
        )
      ).toEqual([]);
      expect(
        issuesFor(
          {},
          draftWith(
            { $ref: '#/definitions/value' },
            { definitions: { value: { type: 'string', default: 'ok' } } }
          ),
          saved
        )
      ).toEqual([]);
      // A filled-in default still has to pass validation.
      expect(
        issuesFor(
          {},
          draftWith({
            type: 'object',
            properties: { size: { type: 'number', default: 10 }, host: { type: 'string' } },
            required: ['size', 'host'],
          }),
          saved
        )
      ).toEqual(['defaultValueRejected:breaking']);
      expect(issuesFor({}, draftWith({ type: 'string' }), saved)).toEqual([
        'missingRequiredInput:breaking',
      ]);
    });

    it('resolves ${{ consts.x }} to the constant', () => {
      const draft = childWithInputs({ limit: { type: 'number' } });
      expect(
        issuesFor({ limit: '${{ consts.limit }}' }, draft, draft, { consts: { limit: 'ten' } })
      ).toEqual(['inputTypeMismatch:breaking']);
      expect(
        issuesFor({ limit: '${{ consts.limit }}' }, draft, draft, { consts: { limit: 10 } })
      ).toEqual([]);
    });

    it('only warns about values computed while running when the input accepts less', () => {
      const asInteger = childWithInputs({ n: { type: 'integer' } });
      const asNumber = childWithInputs({ n: { type: 'number' } });
      const computed = { n: '${{ steps.x.output.n }}' };

      expect(issuesFor(computed, asNumber, asInteger)).toEqual([]);
      expect(issuesFor(computed, asInteger, asNumber)).toEqual(['inputTypeChanged:warning']);
      expect(analyzeWith([typedCaller(computed)], asNumber, asInteger).contractChanges).toEqual([
        expect.objectContaining({ kind: 'inputTypeChanged', severity: 'info' }),
      ]);
    });

    it('flags enum values that are no longer allowed', () => {
      const saved = childWithInputs({ level: { type: 'string', enum: ['low', 'mid', 'high'] } });
      const draft = childWithInputs({ level: { type: 'string', enum: ['low', 'high'] } });

      expect(issuesFor({ level: 'mid' }, draft, saved)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ level: '${{ inputs.level }}' }, draft, saved)).toEqual([
        'inputAllowedValuesChanged:warning',
      ]);
      expect(issuesFor({ level: 'low' }, draft, saved)).toEqual([]);
    });

    it('breaks unknown inputs only when the schema rejects them', () => {
      const lenient = childWithInputs({ a: { type: 'string' } });
      const strict = childWithInputs({ a: { type: 'string' } }, { additionalProperties: false });

      expect(issuesFor({ a: 'x', extra: 1 }, lenient)).toEqual(['unknownInput:warning']);
      expect(issuesFor({ a: 'x', extra: 1 }, strict, lenient)).toEqual(['unknownInput:breaking']);
    });

    it('breaks a forwarded optional input whose type never fits, when leaving it out fails too', () => {
      const optionalNumber = {
        triggers: [{ type: 'manual', inputs: [{ name: 'n', type: 'number' }] }],
      };
      const forwarded = { x: '${{ inputs.n }}' };
      const required = childWithInputs({ x: { type: 'string' } }, { required: ['x'] });
      const optional = childWithInputs({ x: { type: 'string' } });

      expect(issuesFor(forwarded, required, required, optionalNumber)).toEqual([
        'inputTypeMismatch:breaking',
      ]);
      expect(issuesFor(forwarded, optional, optional, optionalNumber)).toEqual([
        'inputTypeMismatch:warning',
      ]);
    });

    it('warns when an optional input the caller passes on becomes required', () => {
      const callerInputs = { inputs: { properties: { x: { type: 'string' } } } };
      const forwarded = { x: '${{ inputs.x }}' };
      const optional = childWithInputs({ x: { type: 'string' } });
      const required = childWithInputs({ x: { type: 'string' } }, { required: ['x'] });
      const withDefault = childWithInputs(
        { x: { type: 'string', default: 'a' } },
        { required: ['x'] }
      );
      const callerOf = (draft: unknown, saved: unknown) =>
        dependentOf(analyzeWith([typedCaller(forwarded, callerInputs)], draft, saved), 'caller');

      expect(kinds(callerOf(required, optional)?.issues)).toEqual(['inputMayBeMissing:warning']);
      expect(callerOf(required, optional)?.status).toBe('warning');
      // Already required in the saved version, so saving changes nothing for it.
      expect(callerOf(required, required)?.status).toBe('safe');
      expect(issuesFor(forwarded, withDefault, optional, callerInputs)).toEqual([]);
      expect(issuesFor(forwarded, optional, optional, callerInputs)).toEqual([]);
    });

    it('fills in the defaults of a sent object’s missing fields like the run does', () => {
      const draft = childWithInputs({
        config: {
          type: 'object',
          properties: {
            options: {
              type: 'object',
              properties: { limit: { type: 'number', default: 10 } },
              required: ['limit'],
            },
          },
          required: ['options'],
        },
      });

      expect(issuesFor({ config: {} }, draft)).toEqual([]);
      expect(issuesFor({ config: { options: { limit: 'ten' } } }, draft)).toEqual([
        'inputValueRejected:breaking',
      ]);
    });

    it('requires the keys a map-only inputs schema requires', () => {
      const mapOf = (extra = {}) => ({
        ...makeChild(),
        triggers: [{ type: 'manual' }],
        inputs: { type: 'object', additionalProperties: { type: 'string' }, ...extra },
      });
      const draft = mapOf({ required: ['token'] });

      expect(issuesFor({}, draft, mapOf())).toEqual(['missingRequiredInput:breaking']);
      expect(issuesFor({ token: 'abc' }, draft, mapOf())).toEqual([]);
      expect(issuesFor({ token: 1 }, draft, mapOf())).toEqual(['inputTypeMismatch:breaking']);
    });

    it('checks undeclared inputs against an additionalProperties schema', () => {
      const asText = childWithInputs(
        { a: { type: 'string' } },
        { additionalProperties: { type: 'string' } }
      );
      const asNumber = childWithInputs(
        { a: { type: 'string' } },
        { additionalProperties: { type: 'number' } }
      );
      const lenient = childWithInputs({ a: { type: 'string' } });

      expect(issuesFor({ a: 'x', extra: 'hello' }, asText)).toEqual([]);
      expect(issuesFor({ a: 'x', extra: 'hello' }, asNumber, asText)).toEqual([
        'inputTypeMismatch:breaking',
      ]);
      expect(issuesFor({ a: 'x', extra: '${{ inputs.n }}' }, asNumber, asText)).toEqual([
        'inputTypeChanged:warning',
      ]);
      expect(
        analyzeWith([typedCaller({ a: 'x' })], asNumber, asText).contractChanges.map(
          ({ kind, severity }) => `${kind}:${severity}`
        )
      ).toEqual(['inputTypeChanged:breaking']);
      expect(
        analyzeWith([typedCaller({ a: 'x' })], asNumber, lenient).contractChanges.map(
          ({ kind, severity }) => `${kind}:${severity}`
        )
      ).toEqual(['inputSchemaChanged:warning']);
    });

    it('can’t check computed inputs once unknown inputs are rejected', () => {
      const lenient = childWithInputs({ a: { type: 'string' } });
      const strict = childWithInputs({ a: { type: 'string' } }, { additionalProperties: false });
      const caller = workflow('caller', [callStep('ctx', { inputs: '${{ inputs.payload }}' })]);

      expect(statusById(analyzeWith([caller], strict, lenient)).caller).toBe('unknown');
    });

    it('counts a problem that turns from a warning into a break as new', () => {
      const lenient = childWithInputs({ a: { type: 'string' } });
      const strict = childWithInputs({ a: { type: 'string' } }, { additionalProperties: false });
      const caller = typedCaller({ a: 'x', extra: 1 });

      const stricter = analyzeWith([caller], strict, lenient);
      expect(dependentOf(stricter, 'caller')).toMatchObject({
        status: 'breaking',
        issues: [expect.objectContaining({ kind: 'unknownInput', isNew: true })],
      });
      expect(stricter.summary.breaking).toBe(1);

      const looser = analyzeWith([caller], lenient, strict);
      expect(dependentOf(looser, 'caller')).toMatchObject({
        status: 'safe',
        issues: [expect.objectContaining({ kind: 'unknownInput', isNew: false })],
      });
    });

    it('only warns about output type changes that widen what callers get', () => {
      const reader = workflow('reader', [
        callStep('ctx', { inputs: { alert_id: 'a' } }),
        { name: 'log', type: 'console', with: { m: '{{ steps.ctx.output.score }}' } },
      ]);
      const asNumber = makeChild({ outputs: [{ name: 'score', type: 'number' }] });
      const asNumberOrNull = makeChild({ outputs: [{ name: 'score', type: ['number', 'null'] }] });

      expect(
        kinds(dependentOf(analyzeWith([reader], asNumberOrNull, asNumber), 'reader')?.issues)
      ).toEqual(['outputTypeChanged:warning']);
      expect(
        kinds(dependentOf(analyzeWith([reader], asNumber, asNumberOrNull), 'reader')?.issues)
      ).toEqual([]);
    });
  });

  describe('callers further up the chain', () => {
    // `b` reads the severity output; removing it breaks `b` without failing it.
    const readsSeverity = workflow('b', [
      callStep('ctx', { inputs: { alert_id: 'a' } }),
      { name: 'log', type: 'console', with: { m: '{{ steps.ctx.output.severity }}' } },
      {
        name: 'out',
        type: 'workflow.output',
        with: { label: '{{ steps.ctx.output.severity }}', other: 'fixed' },
      },
    ]);
    // `f` misses the required input once it's added, so the step fails.
    const failsOnNewInput = workflow('f', [callStep('ctx', { inputs: { alert_id: 'a' } })]);
    const withTenant = makeChild({
      inputs: [
        { name: 'alert_id', type: 'string', required: true },
        { name: 'tenant', type: 'string', required: true },
      ],
    });
    const runs = (id: string, target: string, extra: Record<string, unknown> = {}, type?: string) =>
      workflow(id, [{ ...callStep(`run-${target}`, {}, type, target), ...extra }]);
    const upstreamOf = (analysis: DependentsAnalysis, id: string) =>
      dependentOf(analysis, id)?.upstream.map(({ workflowId, effect, field }) =>
        [workflowId, effect, field].filter(Boolean).join(':')
      );

    it('fails grandparents that wait for a failing caller, but not background or continuing ones', () => {
      const analysis = analyzeWith(
        [
          failsOnNewInput,
          runs('waits', 'f'),
          runs('background', 'f', {}, 'workflow.executeAsync'),
          runs('continues', 'f', { 'on-failure': { continue: true } }),
          runs('grandparent', 'waits'),
        ],
        withTenant
      );

      expect(upstreamOf(analysis, 'f')).toEqual([
        'waits:fails',
        'continues:missingOutput',
        'grandparent:fails',
      ]);
      expect(analysis.summary.indirectBreaking).toBe(3);
    });

    it('follows outputs passed on through workflow.output to the workflows that read them', () => {
      const readsLabel = workflow('reads-label', [
        callStep('b', {}, undefined, 'b'),
        { name: 'log', type: 'console', with: { m: '{{ steps.b.output.label }}' } },
      ]);
      const readsOther = workflow('reads-other', [
        callStep('b', {}, undefined, 'b'),
        { name: 'log', type: 'console', with: { m: '{{ steps.b.output.other }}' } },
      ]);
      const analysis = analyzeWith([readsSeverity, readsLabel, readsOther], withoutSeverity);

      expect(upstreamOf(analysis, 'b')).toEqual(['reads-label:missingOutput:label']);
    });

    it('does not report a caller that keeps working without the output as failing', () => {
      const analysis = analyzeWith([readsSeverity, runs('above', 'b')], withoutSeverity);

      expect(dependentOf(analysis, 'b')?.status).toBe('breaking');
      expect(upstreamOf(analysis, 'b')).toEqual([]);
    });

    it('counts a workflow reached through two breaking callers once', () => {
      const failsToo = workflow('f2', [callStep('ctx', { inputs: { alert_id: 'a' } })]);
      const diamond = workflow('diamond', [
        callStep('one', {}, undefined, 'f'),
        callStep('two', {}, undefined, 'f2'),
      ]);
      const analysis = analyzeWith([failsOnNewInput, failsToo, diamond], withTenant);

      expect(upstreamOf(analysis, 'f')).toEqual(['diamond:fails']);
      expect(upstreamOf(analysis, 'f2')).toEqual(['diamond:fails']);
      expect(analysis.summary).toMatchObject({ breaking: 2, indirectBreaking: 1 });
    });

    it('gives a workflow reached through several paths the worst effect, and follows it on', () => {
      const lossy = workflow('lossy', [
        { ...callStep('run-f', {}, undefined, 'f'), 'on-failure': { continue: true } },
        { name: 'out', type: 'workflow.output', with: { result: '{{ steps.run-f.output.x }}' } },
      ]);
      // Reached first through `lossy`, which only loses `result`, then through `waits`, which fails.
      const shared = workflow('shared', [
        callStep('run-lossy', {}, undefined, 'lossy'),
        { name: 'log', type: 'console', with: { m: '{{ steps.run-lossy.output.result }}' } },
        callStep('run-waits', {}, undefined, 'waits'),
      ]);
      const analysis = analyzeWith(
        [failsOnNewInput, lossy, runs('waits', 'f'), shared, runs('top', 'shared')],
        withTenant
      );

      expect(upstreamOf(analysis, 'f')).toEqual([
        'lossy:missingOutput',
        'waits:fails',
        'shared:fails',
        'top:fails',
      ]);
    });

    it('leaves out callers that are turned off', () => {
      const offCaller = { ...failsOnNewInput, id: 'off', name: 'off', enabled: false };
      const offGrandparent = { ...runs('off-grandparent', 'f'), enabled: false };
      const analysis = analyzeWith([failsOnNewInput, offCaller, offGrandparent], withTenant);

      expect(statusById(analysis)).toMatchObject({ f: 'breaking', off: 'breaking' });
      expect(analysis.summary.breaking).toBe(1);
      expect(upstreamOf(analysis, 'f')).toEqual([]);
    });

    it('follows chains as deep as runs can nest, and no further', () => {
      const levels = Array.from({ length: MAX_INDIRECT_DEPTH }, (_, position) => position + 1);
      const chain = [
        failsOnNewInput,
        ...levels.map((level) => runs(`level-${level}`, level === 1 ? 'f' : `level-${level - 1}`)),
      ];
      const analysis = analyzeWith(chain, withTenant);

      // `f` itself is the first level, so the last caller in the chain is past the limit.
      expect(upstreamOf(analysis, 'f')).toEqual(
        levels.slice(0, MAX_INDIRECT_DEPTH - 1).map((level) => `level-${level}:fails`)
      );
    });
  });

  describe('validity', () => {
    it('breaks every caller when saving would store the workflow invalid', () => {
      const analysis = analyzeDependents({
        index,
        savedDefinition: makeChild(),
        draftDefinition: makeChild(),
        isDraftValid: false,
      });

      expect(analysis.contractChanges).toEqual([
        expect.objectContaining({ kind: 'invalid', severity: 'breaking' }),
      ]);
      expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual(['childInvalid:breaking']);
      // The rows still describe the call with the last valid contract.
      expect(dependentOf(analysis, 'triage')?.callSites[0].inputs).toEqual([
        expect.objectContaining({ name: 'alert_id', status: 'ok' }),
      ]);
    });

    it('handles invalid drafts of any shape', () => {
      const draft = { ...makeChild(), triggers: 'invalid' };

      const analysis = analyzeDependents({
        index,
        savedDefinition: makeChild(),
        draftDefinition: draft,
        isDraftValid: false,
      });
      expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual(['childInvalid:breaking']);
      expect(() =>
        analyzeDependents({ index, savedDefinition: makeChild(), draftDefinition: draft })
      ).not.toThrow();
    });

    it('marks callers of a workflow already saved invalid as already broken', () => {
      const analysis = analyzeDependents({ index, savedDefinition: null, draftDefinition: null });

      expect(statusById(analysis).triage).toBe('alreadyBroken');
    });
  });

  describe('managed workflows', () => {
    const managedNightly = { ...nightly, id: 'managed-nightly', managed: true };
    const workflows = [triage, { ...triage, id: 'managed-triage', managed: true }, nightly];

    it('marks the callers that aren’t managed as already broken, since they can’t run it', () => {
      const analysis = analyzeDependents({
        index: buildDependentsIndex(CHILD_ID, workflows),
        savedDefinition: makeChild(),
        draftDefinition: withoutSeverity,
        managed: true,
      });

      expect(statusById(analysis)).toEqual({
        'managed-triage': 'breaking',
        triage: 'alreadyBroken',
      });
      expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual(['childManaged:breaking']);
      expect(analysis.summary.indirectBreaking).toBe(0);
    });

    it('doesn’t blame a draft for callers further up that can’t run a managed caller', () => {
      const managedTriage = { ...triage, managed: true };
      const callsManaged = workflow('calls-managed', [callStep('run', {}, undefined, 'triage')]);
      const analysis = analyzeDependents({
        index: buildDependentsIndex(CHILD_ID, [managedTriage, callsManaged, managedNightly]),
        savedDefinition: makeChild(),
        draftDefinition: makeChild({
          inputs: [
            { name: 'alert_id', type: 'string', required: true },
            { name: 'tenant', type: 'string', required: true },
          ],
        }),
      });

      expect(dependentOf(analysis, 'triage')?.upstream.map(({ workflowId }) => workflowId)).toEqual(
        ['managed-nightly']
      );
    });
  });
});

describe('analyzeCalledWorkflows', () => {
  const analyzeParent = (steps: unknown[], workflows: WorkflowLookupItem[] = [childItem]) =>
    analyzeCalledWorkflows({
      workflowId: 'parent',
      definition: { name: 'Parent', steps },
      workflows,
    });

  it('accepts a call that sends the required inputs and reads declared outputs', () => {
    const [called] = analyzeCalledWorkflows({
      workflowId: 'triage',
      definition: triage.definition,
      workflows: [childItem],
    });

    expect(called).toMatchObject({ workflowId: CHILD_ID, status: 'safe', issues: [] });
  });

  it('flags missing inputs and outputs the child does not return', () => {
    const [called] = analyzeParent([
      callStep('ctx', { inputs: {} }),
      { name: 'log', type: 'console', with: { message: '{{ steps.ctx.output.summary }}' } },
    ]);

    expect(called.status).toBe('breaking');
    expect(called.issues).toEqual([
      expect.objectContaining({ kind: 'missingRequiredInput', field: 'alert_id' }),
      expect.objectContaining({ kind: 'removedOutput', field: 'summary' }),
    ]);
  });

  it('fills in defaults for null values, as runs do', () => {
    const [called] = analyzeParent([callStep('ctx', { inputs: { alert_id: null, depth: null } })]);

    expect(called.issues).toEqual([
      expect.objectContaining({ kind: 'inputTypeMismatch', field: 'alert_id', from: 'null' }),
    ]);
  });

  it('checks an inputs block that is not an object as the inputs it sends', () => {
    const issuesFor = (inputs: unknown) =>
      kinds(analyzeParent([callStep('ctx', { inputs })])[0].issues);

    expect(issuesFor('{{ inputs.payload }}')).toEqual(['missingRequiredInput:breaking']);
    expect(issuesFor(['abc'])).toEqual(['unknownInput:warning', 'missingRequiredInput:breaking']);
    expect(issuesFor('${{ inputs.payload }}')).toEqual([]);
  });

  it('treats a reference to a constant that does not exist as an omitted input', () => {
    const [called] = analyzeCalledWorkflows({
      workflowId: 'parent',
      definition: {
        name: 'Parent',
        consts: { known: 'abc' },
        steps: [callStep('ctx', { inputs: { alert_id: '${{ consts.unknown }}' } })],
      },
      workflows: [childItem],
    });

    expect(kinds(called.issues)).toEqual(['missingRequiredInput:breaking']);
  });

  it('flags a text template default on an input that does not accept text', () => {
    const child = {
      ...childItem,
      definition: makeChild({
        inputs: [{ name: 'depth', type: 'number', default: '{{ consts.depth }}' }],
      }),
    };

    const [called] = analyzeParent([callStep('ctx', { inputs: {} })], [child]);

    expect(called.issues).toEqual([
      expect.objectContaining({ kind: 'defaultValueRejected', field: 'depth' }),
    ]);
  });

  it('checks how many items a list sends even when the items are templates', () => {
    const child = {
      ...childItem,
      definition: makeChild({
        inputs: [{ name: 'ids', type: 'array', items: { type: 'string' }, minItems: 2 }],
      }),
    };

    const [called] = analyzeParent(
      [callStep('ctx', { inputs: { ids: ['{{ event.id }}'] } })],
      [child]
    );

    expect(called.issues).toEqual([
      expect.objectContaining({ kind: 'inputValueRejected', field: 'ids' }),
    ]);
  });

  it('flags children that are turned off, invalid, missing, or the workflow itself', () => {
    const called = analyzeParent(
      [
        callStep('ctx', { inputs: { alert_id: 'a' } }),
        callStep('bad', {}, undefined, 'invalid'),
        callStep('other', {}, undefined, 'missing'),
        callStep('again', {}, undefined, 'parent'),
      ],
      [
        { ...childItem, enabled: false },
        { id: 'invalid', name: 'invalid', enabled: false, definition: null },
      ]
    );

    expect(
      called.map(({ workflowId, issues }) => [workflowId, issues.map(({ kind }) => kind)])
    ).toEqual([
      [CHILD_ID, ['childDisabled']],
      ['invalid', ['childInvalid']],
      ['parent', ['selfCall']],
      ['missing', ['childNotFound']],
    ]);
    // The lookup leaves out workflows the user can't read, so a missing one may still run.
    expect(called.find(({ workflowId }) => workflowId === 'missing')).toMatchObject({
      status: 'unknown',
      issues: [expect.objectContaining({ kind: 'childNotFound', severity: 'warning' })],
    });
  });

  it('flags a managed child, which only a managed workflow can run', () => {
    const managedChild = { ...childItem, managed: true };
    const middle = workflow('middle', [callStep('ctx', { inputs: { alert_id: 'a' } })]);
    const steps = [
      callStep('ctx', { inputs: { alert_id: 'a' } }),
      callStep('bg', { inputs: { alert_id: 'a' } }, 'workflow.executeAsync'),
      callStep('m', {}, undefined, 'middle'),
    ];

    const called = analyzeParent(steps, [managedChild, middle]);
    expect(called.map(({ workflowId, issues }) => [workflowId, kinds(issues)])).toEqual([
      [CHILD_ID, ['childManaged:breaking', 'childManaged:breaking']],
      ['middle', []],
    ]);

    const fromManaged = analyzeCalledWorkflows({
      workflowId: 'parent',
      definition: { name: 'Parent', steps },
      workflows: [managedChild, middle],
      managed: true,
    });
    expect(fromManaged.map(({ workflowId, status }) => [workflowId, status])).toEqual([
      [CHILD_ID, 'safe'],
      ['middle', 'safe'],
    ]);
  });
});

describe('mayLoseImplicitOutput', () => {
  const reads = [{ stepName: 'ctx' }];
  const ctx = callStep('ctx', {});

  it('is true when the last step is the step, holds it, or reads it without a fallback', () => {
    const lastStep = (step: Record<string, unknown>) => ({ steps: [ctx, step] });

    expect(mayLoseImplicitOutput({ steps: [ctx] }, reads)).toBe(true);
    expect(
      mayLoseImplicitOutput(
        { steps: [{ name: 'if', type: 'if', condition: 'true', steps: [ctx] }] },
        reads
      )
    ).toBe(true);
    expect(
      mayLoseImplicitOutput(
        lastStep({ name: 'keep', type: 'data.set', with: { v: '{{ steps.ctx.output.v }}' } }),
        reads
      )
    ).toBe(true);
    expect(
      mayLoseImplicitOutput(
        lastStep({
          name: 'keep',
          type: 'data.set',
          with: { v: '{{ steps.ctx.output.v | default: 1 }}' },
        }),
        reads
      )
    ).toBe(false);
    expect(mayLoseImplicitOutput(lastStep({ name: 'log', type: 'console' }), reads)).toBe(false);
  });

  it('is false when every run that reaches the end returns a workflow.output', () => {
    const output = {
      name: 'out',
      type: 'workflow.output',
      with: { v: '{{ steps.ctx.output.v }}' },
    };

    expect(mayLoseImplicitOutput({ steps: [ctx, output] }, reads)).toBe(false);
    expect(mayLoseImplicitOutput({ steps: [ctx, { ...output, if: 'true' }] }, reads)).toBe(true);
  });
});

describe('analyzeRemovalImpact', () => {
  it('lists enabled callers and counts the workflows further up that fail', () => {
    const impact = analyzeRemovalImpact(
      [CHILD_ID],
      [triage, enrich, fanout, nightly, { ...alreadyBroken, enabled: false }]
    );

    expect(impact.callers.map(({ id }) => id)).toEqual(['enrich', 'fanout', 'triage']);
    expect(impact.indirect).toBe(1);
  });

  it('fails callers whose own on-failure overrides a workflow-level continue', () => {
    const strictStep = workflow(
      'strict-step',
      [{ ...callStep('ctx', { inputs: { alert_id: 'a' } }), 'on-failure': { continue: false } }],
      { settings: { 'on-failure': { continue: true } } }
    );
    const top = workflow('top', [callStep('run', {}, undefined, 'strict-step')]);

    expect(analyzeRemovalImpact([CHILD_ID], [strictStep, top]).indirect).toBe(1);
  });

  it('takes a caller that might recover to keep running without the step’s outputs', () => {
    const recovering = workflow('recovering', [
      {
        ...callStep('ctx', { inputs: { alert_id: 'a' } }),
        'on-failure': { continue: true },
      },
      {
        name: 'emit',
        type: 'workflow.output',
        with: { severity: '${{ steps.ctx.output.severity }}' },
      },
    ]);
    const reads = workflow('reads', [
      callStep('run', {}, undefined, 'recovering'),
      { name: 'log', type: 'console', with: { m: '{{ steps.run.output.severity }}' } },
    ]);
    const ignores = workflow('ignores', [callStep('run', {}, undefined, 'recovering')]);

    expect(analyzeRemovalImpact([CHILD_ID], [recovering, reads, ignores]).indirect).toBe(1);
  });

  it('fails callers whose fallback goes on, since the engine fails the step after it', () => {
    const fallingBack = workflow('falling-back', [
      {
        ...callStep('ctx', { inputs: { alert_id: 'a' } }),
        'on-failure': { fallback: [{ name: 'log', type: 'console' }] },
      },
    ]);
    const top = workflow('top', [callStep('run', {}, undefined, 'falling-back')]);

    expect(analyzeRemovalImpact([CHILD_ID], [fallingBack, top]).indirect).toBe(1);
  });

  it.each(['loop.break', 'loop.continue'])(
    'fails callers whose fallback runs %s in a loop of its own, which leaves only that loop',
    (type) => {
      const fallingBack = workflow('falling-back', [
        {
          ...callStep('ctx', {}),
          'on-failure': {
            fallback: [
              { name: 'inner', type: 'foreach', foreach: '[1]', steps: [{ name: 'leave', type }] },
            ],
          },
        },
      ]);
      const top = workflow('top', [callStep('run', {}, undefined, 'falling-back')]);

      expect(analyzeRemovalImpact([CHILD_ID], [fallingBack, top]).indirect).toBe(1);
    }
  );

  it('follows outputs a caller returns without a workflow.output step, from its last step', () => {
    const forwards = workflow('forwards', [
      { ...callStep('ctx', {}), 'on-failure': { continue: true } },
      { name: 'keep', type: 'data.set', with: { value: '${{ steps.ctx.output.value }}' } },
    ]);
    const endsInCall = workflow('ends-in-call', [
      { ...callStep('ctx', {}), 'on-failure': { continue: true } },
    ]);
    const readsOutput = (calledId: string) =>
      workflow(`reads-${calledId}`, [
        callStep('run', {}, undefined, calledId),
        { name: 'emit', type: 'workflow.output', with: { value: '${{ steps.run.output.value }}' } },
      ]);

    expect(analyzeRemovalImpact([CHILD_ID], [forwards, readsOutput('forwards')]).indirect).toBe(1);
    expect(
      analyzeRemovalImpact([CHILD_ID], [endsInCall, readsOutput('ends-in-call')]).indirect
    ).toBe(1);
  });

  it('ignores calls between workflows that are removed together', () => {
    const impact = analyzeRemovalImpact([CHILD_ID, 'triage'], [triage, nightly]);

    expect(impact.callers.map(({ id }) => id)).toEqual(['nightly']);
    expect(impact.indirect).toBe(0);
  });

  it('doesn’t follow callers that run a failing caller in the background', () => {
    const background = workflow('background', [
      callStep('run', {}, 'workflow.executeAsync', 'triage'),
    ]);
    expect(analyzeRemovalImpact([CHILD_ID], [triage, background]).indirect).toBe(0);
  });

  it('doesn’t count unmanaged workflows above a managed caller, since they can’t run it', () => {
    const managedCaller = { ...triage, managed: true };
    const runTriage = callStep('run', {}, undefined, 'triage');
    const unmanagedTop = workflow('top', [runTriage]);
    const managedTop = { ...workflow('managed-top', [runTriage]), managed: true };
    expect(analyzeRemovalImpact([CHILD_ID], [managedCaller, unmanagedTop]).indirect).toBe(0);
    expect(analyzeRemovalImpact([CHILD_ID], [managedCaller, managedTop]).indirect).toBe(1);
  });
});
