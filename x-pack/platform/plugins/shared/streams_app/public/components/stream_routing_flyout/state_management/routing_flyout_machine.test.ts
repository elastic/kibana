/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, setup } from 'xstate';
import {
  getNewRoutingNodeRules,
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
      rules: getNewRoutingNodeRules(line),
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
        condition: undefined,
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
        condition: { field: 'team', operator: 'equals', value: 'a' },
        action: 'copy',
      },
    });
    flyout.send({ type: 'flyout.save' });

    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["team"] == "a"', action: 'copy', destinations: [] },
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
        condition: { field: 'service.name', operator: 'equals', value: 'x' },
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
      changes: { condition: { field: 'body', operator: 'equals', value: 'x' } },
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
        { destinations: ['es-logs'] },
      ],
    });
    flyout.send({
      type: 'rule.update',
      key: 'rule-0',
      changes: { condition: { field: '  ', operator: 'equals', value: 'a' } },
    });
    const { rules } = flyout.getSnapshot().context;
    expect(rules.map(({ key }) => key)).toEqual(['rule-1', 'rule-2', 'rule-0']);
    expect(rules[2].condition).toBeUndefined();

    // Default rules cannot be dragged above the conditional ones.
    flyout.send({ type: 'rule.reorder', from: 2, to: 0 });
    flyout.send({ type: 'rule.reorder', from: 0, to: 1 });
    expect(flyout.getSnapshot().context.rules.map(({ key }) => key)).toEqual([
      'rule-1',
      'rule-2',
      'rule-0',
    ]);
    flyout.send({ type: 'rule.add' });
    expect(flyout.getSnapshot().context.rules.map(({ key }) => key)).toEqual([
      'rule-1',
      'rule-3',
      'rule-2',
      'rule-0',
    ]);

    flyout.send({ type: 'rule.delete', key: 'rule-3' });
    flyout.send({ type: 'flyout.save' });
    expect(requests[0].rules).toEqual([
      { when: 'resource.attributes["team"] == "b"', destinations: ['es-b'] },
      { destinations: ['es-logs'] },
      { destinations: ['es-a'] },
    ]);
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
