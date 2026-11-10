/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, setup } from 'xstate';
import {
  getUnmatchedSignals,
  routingFlyoutMachine,
  type RoutingFlyoutInput,
  type RoutingSaveRequest,
} from './routing_flyout_machine';

const line = {
  origin: { kind: 'source' as const, id: 'otlp-input' },
  destinationId: 'es-logs',
};

const startFlyout = (overrides: Partial<Omit<RoutingFlyoutInput, 'parentRef'>> = {}) => {
  const requests: RoutingSaveRequest[] = [];
  const parent = createActor(
    setup({ types: { events: {} as RoutingSaveRequest } }).createMachine({
      on: { 'routing.save': { actions: ({ event }) => requests.push(event) } },
    })
  ).start();
  const flyout = createActor(routingFlyoutMachine, {
    input: {
      target: { kind: 'line', line },
      rules: [{ destinations: [line.destinationId] }],
      signals: ['logs'],
      availableSignals: ['logs', 'traces'],
      editable: true,
      parentRef: parent,
      ...overrides,
    },
  }).start();
  return { flyout, requests };
};

describe('routingFlyoutMachine', () => {
  it('starts a new routing node with a catch-all rule that keeps the line destination', () => {
    const { flyout, requests } = startFlyout();
    const { context } = flyout.getSnapshot();
    expect(context.rules).toEqual([
      {
        key: 'rule-0',
        when: undefined,
        action: 'move',
        telemetry: ['logs'],
        base: { destinations: ['es-logs'] },
      },
    ]);
    expect(getUnmatchedSignals(context.rules, context.availableSignals)).toEqual([]);
    expect(context.hasChanges).toBe(false);

    flyout.send({ type: 'flyout.save' });
    expect(flyout.getSnapshot().value).toBe('saving');
    expect(requests).toEqual([
      {
        type: 'routing.save',
        target: { kind: 'line', line },
        rules: [{ destinations: ['es-logs'] }],
        supportedTelemetry: ['logs'],
      },
    ]);
  });

  it('adds rules above the catch-all that route nowhere and writes their condition and action', () => {
    const { flyout, requests } = startFlyout();
    flyout.send({ type: 'rule.add' });
    flyout.send({
      type: 'rule.update',
      key: 'rule-1',
      changes: {
        when: 'resource.attributes["team"] == "a"',
        action: 'copy',
      },
    });
    flyout.send({ type: 'flyout.save' });

    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["team"] == "a"', action: 'copy', destinations: [] },
      { destinations: ['es-logs'] },
    ]);
  });

  it('writes the condition typed into the rule as its when', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'resource.attributes["env"] == "prod"', destinations: ['es-a'] },
        { destinations: ['es-logs'] },
      ],
    });
    flyout.send({
      type: 'rule.update',
      key: 'rule-0',
      changes: { when: '  severity_number >= 17 and IsMatch(body, "error")  ' },
    });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'severity_number >= 17 and IsMatch(body, "error")', destinations: ['es-a'] },
      { destinations: ['es-logs'] },
    ]);
  });

  it('widens the routing node to the signals its rules handle', () => {
    const { flyout, requests } = startFlyout();
    flyout.send({ type: 'rule.add' });
    flyout.send({
      type: 'rule.update',
      key: 'rule-1',
      changes: {
        when: 'resource.attributes["service.name"] == "x"',
        telemetry: ['traces', 'logs'],
      },
    });
    flyout.send({ type: 'flyout.save' });

    expect(requests[0].supportedTelemetry).toEqual(['logs', 'traces']);
    // The catch-all keeps handling logs only, so it now names its signal.
    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["service.name"] == "x"', destinations: [] },
      { destinations: ['es-logs'], telemetry: ['logs'] },
    ]);
  });

  it('keeps rule signals and cannot save a rule without any', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [{ when: 'body == "x"', destinations: ['es-logs'], telemetry: ['logs'] }],
      signals: ['logs', 'traces'],
    });
    expect(flyout.getSnapshot().context.rules[0].telemetry).toEqual(['logs']);

    flyout.send({ type: 'rule.update', key: 'rule-0', changes: { telemetry: [] } });
    flyout.send({ type: 'flyout.save' });
    expect(requests).toEqual([]);

    flyout.send({ type: 'rule.update', key: 'rule-0', changes: { telemetry: ['logs', 'traces'] } });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0]).toMatchObject({
      supportedTelemetry: ['logs', 'traces'],
      rules: [{ when: 'body == "x"', destinations: ['es-logs'], telemetry: ['logs', 'traces'] }],
    });
  });

  it('warns once no rule is left without a condition', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'rule.add' });
    flyout.send({
      type: 'rule.update',
      key: 'rule-1',
      changes: { when: 'resource.attributes["body"] == "x"' },
    });
    const unmatched = () => {
      const { rules, availableSignals } = flyout.getSnapshot().context;
      return getUnmatchedSignals(rules, availableSignals);
    };
    expect(unmatched()).toEqual([]);

    flyout.send({ type: 'rule.delete', key: 'rule-0' });
    expect(unmatched()).toEqual(['logs']);
  });

  it('reports the signals no rule without a condition covers', () => {
    const { flyout } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { telemetry: ['logs'], destinations: ['es-logs'] },
        { when: 'resource.attributes["team"] == "a"', telemetry: ['traces'], destinations: [] },
      ],
      signals: ['logs', 'traces'],
      availableSignals: ['logs', 'traces'],
    });
    const { rules, availableSignals } = flyout.getSnapshot().context;
    expect(getUnmatchedSignals(rules, availableSignals)).toEqual(['traces']);
  });

  it('edits an existing routing node without touching the fields it does not show', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'body == "x"', destinations: ['es-logs'], processors: ['tag'] },
        { when: 'severity_number >= 17', action: 'move', pipelines: ['child'] },
      ],
    });
    expect(flyout.getSnapshot().context.hasChanges).toBe(false);
    flyout.send({ type: 'flyout.save' });
    expect(requests).toEqual([]);

    flyout.send({ type: 'rule.update', key: 'rule-0', changes: { action: 'copy' } });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'body == "x"', action: 'copy', destinations: ['es-logs'], processors: ['tag'] },
      { when: 'severity_number >= 17', action: 'move', pipelines: ['child'] },
    ]);
  });

  it('reorders rules above the catch-all and keeps the catch-all last', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'body == "a"', destinations: ['es-a'] },
        { when: 'body == "b"', destinations: ['es-b'] },
        { destinations: ['es-logs'] },
      ],
    });
    const keys = () => flyout.getSnapshot().context.rules.map(({ key }) => key);

    flyout.send({ type: 'rule.reorder', from: 1, to: 0 });
    expect(keys()).toEqual(['rule-1', 'rule-0', 'rule-2']);
    expect(flyout.getSnapshot().context.hasChanges).toBe(true);

    // Neither past the catch-all, nor the catch-all itself.
    flyout.send({ type: 'rule.reorder', from: 0, to: 2 });
    flyout.send({ type: 'rule.reorder', from: 2, to: 0 });
    flyout.send({ type: 'rule.reorder', from: 0, to: 5 });
    expect(keys()).toEqual(['rule-1', 'rule-0', 'rule-2']);

    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'body == "b"', destinations: ['es-b'] },
      { when: 'body == "a"', destinations: ['es-a'] },
      { destinations: ['es-logs'] },
    ]);
  });

  it('moves a rule whose condition is cleared into the default rules at the end', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
        { when: 'resource.attributes["team"] == "b"', destinations: ['es-b'] },
        { telemetry: ['traces'], destinations: ['es-traces'] },
      ],
      signals: ['logs', 'traces'],
      availableSignals: ['logs', 'traces'],
    });
    const keys = () => flyout.getSnapshot().context.rules.map(({ key }) => key);
    flyout.send({
      type: 'rule.update',
      key: 'rule-0',
      changes: { when: '  ' },
    });
    const { rules } = flyout.getSnapshot().context;
    expect(keys()).toEqual(['rule-1', 'rule-2', 'rule-0']);
    expect(rules[2].when).toBeUndefined();

    // Default rules cannot be dragged above the conditional ones.
    flyout.send({ type: 'rule.reorder', from: 2, to: 0 });
    flyout.send({ type: 'rule.reorder', from: 0, to: 1 });
    expect(keys()).toEqual(['rule-1', 'rule-2', 'rule-0']);
    flyout.send({ type: 'rule.add' });
    expect(keys()).toEqual(['rule-1', 'rule-3', 'rule-2', 'rule-0']);

    flyout.send({ type: 'rule.delete', key: 'rule-3' });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["team"] == "b"', destinations: ['es-b'] },
      { telemetry: ['traces'], destinations: ['es-traces'] },
      { destinations: ['es-a'] },
    ]);
  });

  it('merges a rule whose condition is cleared into a default rule handling the same signals', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
        { destinations: ['es-logs'] },
      ],
    });
    flyout.send({
      type: 'rule.update',
      key: 'rule-0',
      changes: { when: '' },
    });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([{ destinations: ['es-logs', 'es-a'] }]);
  });

  it('saves rules left without a field after the rules with conditions', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [{ when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] }],
    });
    flyout.send({ type: 'rule.add' });
    flyout.send({ type: 'rule.reorder', from: 1, to: 0 });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
      { destinations: [] },
    ]);
  });

  it('lets a copy rule with no condition sit above other rules', () => {
    const { flyout, requests } = startFlyout({
      rules: [{ action: 'copy', destinations: ['es-metrics'] }, { destinations: ['es-logs'] }],
    });
    const keys = () => flyout.getSnapshot().context.rules.map(({ key }) => key);
    flyout.send({ type: 'rule.add' });
    expect(keys()).toEqual(['rule-0', 'rule-2', 'rule-1']);
    flyout.send({
      type: 'rule.update',
      key: 'rule-2',
      changes: { when: 'resource.attributes["team"] == "a"' },
    });
    flyout.send({ type: 'rule.reorder', from: 1, to: 0 });
    expect(keys()).toEqual(['rule-2', 'rule-0', 'rule-1']);

    flyout.send({ type: 'rule.reorder', from: 1, to: 0 });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { action: 'copy', destinations: ['es-metrics'] },
      { when: 'resource.attributes["team"] == "a"', destinations: [] },
      { destinations: ['es-logs'] },
    ]);
  });

  it('merges a rule applied with no condition into the existing default rule', () => {
    const { flyout, requests } = startFlyout();
    flyout.send({ type: 'rule.add' });
    flyout.send({
      type: 'rule.update',
      key: 'rule-1',
      changes: { when: '' },
    });
    expect(flyout.getSnapshot().context.rules.map(({ key }) => key)).toEqual(['rule-0']);

    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([{ destinations: ['es-logs'] }]);
  });

  it('merges a rule given the same condition as another, keeping both targets', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
        { when: 'resource.attributes["team"] == "b"', destinations: ['es-b'] },
        { destinations: ['es-logs'] },
      ],
    });
    flyout.send({
      type: 'rule.update',
      key: 'rule-1',
      changes: { when: 'resource.attributes["team"] == "a"' },
    });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["team"] == "a"', destinations: ['es-a', 'es-b'] },
      { destinations: ['es-logs'] },
    ]);
  });

  it('keeps rules with the same condition apart when they handle different signals or actions', () => {
    const { flyout } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { telemetry: ['logs'], destinations: ['es-logs'] },
        { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
      ],
      signals: ['logs', 'traces'],
      availableSignals: ['logs', 'traces'],
    });
    const keys = () => flyout.getSnapshot().context.rules.map(({ key }) => key);
    flyout.send({
      type: 'rule.update',
      key: 'rule-1',
      changes: { when: undefined, telemetry: ['traces'] },
    });
    expect(keys()).toEqual(['rule-0', 'rule-1']);

    flyout.send({ type: 'rule.add' });
    flyout.send({
      type: 'rule.update',
      key: 'rule-2',
      changes: { when: undefined, action: 'copy', telemetry: ['logs'] },
    });
    expect(keys()).toEqual(['rule-2', 'rule-0', 'rule-1']);
  });

  it('discards a default rule whose signals the other default rules already cover', () => {
    const { flyout, requests } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
        { telemetry: ['logs'], destinations: ['es-logs'] },
        { telemetry: ['traces'], destinations: ['es-traces'] },
      ],
      signals: ['logs', 'traces'],
      availableSignals: ['logs', 'traces'],
    });
    const keys = () => flyout.getSnapshot().context.rules.map(({ key }) => key);
    flyout.send({ type: 'rule.add' });
    flyout.send({
      type: 'rule.update',
      key: 'rule-3',
      changes: { when: undefined, telemetry: ['logs', 'traces'] },
    });
    expect(keys()).toEqual(['rule-0', 'rule-1', 'rule-2']);

    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
      { telemetry: ['logs'], destinations: ['es-logs'] },
      { telemetry: ['traces'], destinations: ['es-traces'] },
    ]);
  });

  it('keeps a default rule for signals the other default rules leave uncovered', () => {
    const { flyout } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [
        { when: 'resource.attributes["team"] == "a"', destinations: ['es-a'] },
        { telemetry: ['logs'], destinations: ['es-logs'] },
      ],
      signals: ['logs', 'traces'],
      availableSignals: ['logs', 'traces'],
    });
    flyout.send({ type: 'rule.add' });
    flyout.send({
      type: 'rule.update',
      key: 'rule-2',
      changes: { when: undefined, telemetry: ['logs', 'traces'] },
    });
    const { rules, availableSignals } = flyout.getSnapshot().context;
    expect(rules.map(({ key }) => key)).toEqual(['rule-0', 'rule-1', 'rule-2']);
    expect(getUnmatchedSignals(rules, availableSignals)).toEqual([]);
  });

  it('appends new rules when there is no catch-all', () => {
    const { flyout } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules: [{ when: 'body == "a"', destinations: ['es-a'] }],
    });
    flyout.send({ type: 'rule.add' });
    expect(flyout.getSnapshot().context.rules.map(({ key }) => key)).toEqual(['rule-0', 'rule-1']);
  });

  it('reorders freely once the catch-all is gone, but not when read-only', () => {
    const rules = [
      { when: 'body == "a"', destinations: ['es-a'] },
      { when: 'body == "b"', destinations: ['es-b'] },
    ];
    const { flyout } = startFlyout({ target: { kind: 'pipeline', pipelineId: 'routing' }, rules });
    flyout.send({ type: 'rule.reorder', from: 0, to: 1 });
    expect(flyout.getSnapshot().context.rules.map(({ key }) => key)).toEqual(['rule-1', 'rule-0']);

    const readOnly = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'routing' },
      rules,
      editable: false,
    }).flyout;
    readOnly.send({ type: 'rule.reorder', from: 0, to: 1 });
    expect(readOnly.getSnapshot().context.rules.map(({ key }) => key)).toEqual([
      'rule-0',
      'rule-1',
    ]);
  });

  it('ignores every edit and cannot save for a user who cannot manage the stream', () => {
    const { flyout, requests } = startFlyout({ readOnly: true });
    expect(flyout.getSnapshot().context).toMatchObject({ editable: false, readOnly: true });
    const keys = () => flyout.getSnapshot().context.rules.map(({ key }) => key);

    flyout.send({ type: 'rule.add' });
    flyout.send({ type: 'rule.update', key: 'rule-0', changes: { action: 'copy' } });
    flyout.send({ type: 'rule.delete', key: 'rule-0' });
    expect(keys()).toEqual(['rule-0']);
    expect(flyout.getSnapshot().context.rules[0].action).toBe('move');
    expect(flyout.getSnapshot().context.hasChanges).toBe(false);

    expect(flyout.getSnapshot().can({ type: 'flyout.save' })).toBe(false);
    flyout.send({ type: 'flyout.save' });
    expect(requests).toEqual([]);
  });

  it('saves an existing routing node left without rules, so it is removed', () => {
    const { flyout, requests } = startFlyout({ target: { kind: 'pipeline', pipelineId: 'main' } });
    flyout.send({ type: 'rule.delete', key: 'rule-0' });
    expect(flyout.getSnapshot().context.rules).toEqual([]);

    flyout.send({ type: 'flyout.save' });
    expect(requests).toEqual([
      expect.objectContaining({
        type: 'routing.save',
        target: { kind: 'pipeline', pipelineId: 'main' },
        rules: [],
      }),
    ]);
  });

  it('shows the last save diagnostics on their rules until the condition changes', () => {
    const { flyout } = startFlyout({
      target: { kind: 'pipeline', pipelineId: 'main' },
      rules: [{ when: 'body ==', destinations: ['es-logs'] }, { destinations: ['es-logs'] }],
      diagnostics: [
        { code: 'E050', message: 'bad condition', pipelineId: 'main', ruleIndex: 0 },
        { code: 'E017', message: 'no way out', pipelineId: 'main' },
      ],
    });
    const diagnostics = () => flyout.getSnapshot().context.rules.map((rule) => rule.diagnostics);
    expect(diagnostics()).toEqual([['bad condition'], undefined]);
    expect(flyout.getSnapshot().context.nodeDiagnostics).toEqual(['no way out']);

    flyout.send({ type: 'rule.update', key: 'rule-0', changes: { telemetry: ['logs'] } });
    expect(diagnostics()).toEqual([['bad condition'], undefined]);

    flyout.send({ type: 'rule.update', key: 'rule-0', changes: { when: 'body == "x"' } });
    expect(diagnostics()).toEqual([undefined, undefined]);
  });

  it('cannot save without rules, or when read-only', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'rule.delete', key: 'rule-0' });
    flyout.send({ type: 'flyout.save' });
    expect(flyout.getSnapshot().value).toBe('idle');

    const readOnly = startFlyout({ editable: false }).flyout;
    readOnly.send({ type: 'rule.add' });
    expect(readOnly.getSnapshot().context.rules).toHaveLength(1);
  });

  it('returns to editing with the error when the canvas rejects the save', () => {
    const { flyout } = startFlyout();
    flyout.send({ type: 'flyout.save' });
    flyout.send({ type: 'save.failed', message: 'Nope' });
    expect(flyout.getSnapshot().value).toBe('idle');
    expect(flyout.getSnapshot().context.saveError).toBe('Nope');

    flyout.send({ type: 'flyout.save' });
    flyout.send({ type: 'save.succeeded' });
    expect(flyout.getSnapshot().status).toBe('done');
  });
});
