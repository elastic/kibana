/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, sendTo, setup, type ActorRefFrom, type AnyActorRef } from 'xstate';
import type { RouteRule, UnitSignal } from '../../../services/unit_pipeline';
import type { UnitRoutableLine } from '../../../services/unit_connections';
import {
  createEmptyCondition,
  parseWhen,
  serializeCondition,
  type RoutingRuleCondition,
} from '../routing_rule_condition';

/** What a rule does with matching data: `move` it to the targets, or `copy` it and keep evaluating. */
export type RoutingAction = NonNullable<RouteRule['action']>;

const DEFAULT_ROUTING_ACTION: RoutingAction = 'move';

/** What the flyout configures: a new routing node on a line, or an existing one. */
export type RoutingFlyoutTarget =
  | { kind: 'line'; line: UnitRoutableLine }
  | { kind: 'pipeline'; pipelineId: string };

export interface RoutingRuleDraft {
  /** Stable list key; routing rules have no id of their own. */
  key: string;
  /** `undefined` for a rule with no condition, which matches all remaining data. */
  condition?: RoutingRuleCondition;
  action: RoutingAction;
  /** Signals the rule handles; never empty. */
  telemetry: UnitSignal[];
  /** The rule as saved: its targets, processors and other fields are written back unchanged. */
  base: RouteRule;
}

export interface RoutingFlyoutInput {
  target: RoutingFlyoutTarget;
  rules: RouteRule[];
  /** Signals the routing node handles; rules without their own `telemetry` carry these. */
  signals: UnitSignal[];
  /** Signals that flow into the routing node, which its rules can choose from. */
  availableSignals: UnitSignal[];
  editable: boolean;
  parentRef: AnyActorRef;
}

export interface RoutingFlyoutContext {
  target: RoutingFlyoutTarget;
  rules: RoutingRuleDraft[];
  signals: UnitSignal[];
  availableSignals: UnitSignal[];
  editable: boolean;
  hasChanges: boolean;
  saveError?: string;
  nextKey: number;
  parentRef: AnyActorRef;
}

export type RoutingRuleChanges = Partial<
  Pick<RoutingRuleDraft, 'condition' | 'action' | 'telemetry'>
>;

export type RoutingFlyoutEvent =
  | { type: 'rule.add' }
  | { type: 'rule.update'; key: string; changes: RoutingRuleChanges }
  | { type: 'rule.delete'; key: string }
  | { type: 'rule.reorder'; from: number; to: number }
  | { type: 'flyout.save' }
  | { type: 'save.succeeded' }
  | { type: 'save.failed'; message: string };

/** Sent to the canvas machine, which stages the rules on the unit without persisting it. */
export interface RoutingSaveRequest {
  type: 'routing.save';
  target: RoutingFlyoutTarget;
  rules: RouteRule[];
  /** Every signal the rules handle, which the routing node is widened or narrowed to. */
  supportedTelemetry: UnitSignal[];
}

const toDraft =
  (signals: readonly UnitSignal[]) =>
  (rule: RouteRule, index: number): RoutingRuleDraft => ({
    key: `rule-${index}`,
    condition: parseWhen(rule.when),
    action: rule.action ?? DEFAULT_ROUTING_ACTION,
    telemetry: [...(rule.telemetry ?? signals)],
    base: rule,
  });

/** Every signal the rules handle, in the order they are offered. */
export const getRulesTelemetry = (
  rules: readonly RoutingRuleDraft[],
  availableSignals: readonly UnitSignal[]
): UnitSignal[] => {
  const used = new Set(rules.flatMap(({ telemetry }) => telemetry));
  const ordered = availableSignals.filter((signal) => used.has(signal));
  return [...ordered, ...[...used].filter((signal) => !availableSignals.includes(signal))];
};

/**
 * Signals the rules handle that no rule without a condition covers, so data of
 * those signals that matches no condition is dropped.
 */
export const getUnmatchedSignals = (
  rules: readonly RoutingRuleDraft[],
  availableSignals: readonly UnitSignal[]
): UnitSignal[] => {
  const handled = getRulesTelemetry(rules, availableSignals);
  const covered = new Set(
    rules
      .filter(({ condition }) => serializeCondition(condition) === undefined)
      .flatMap(({ telemetry }) => telemetry)
  );
  return (handled.length > 0 ? handled : [...availableSignals]).filter(
    (signal) => !covered.has(signal)
  );
};

const sameSignals = (left: readonly UnitSignal[], right: readonly UnitSignal[]): boolean =>
  left.length === right.length && left.every((signal) => right.includes(signal));

/**
 * The rule as written to the unit. A rule handling every signal of its routing
 * node leaves `telemetry` unset, unless it set one before.
 */
export const toRouteRule = (
  { condition, action, telemetry, base }: RoutingRuleDraft,
  supportedTelemetry: readonly UnitSignal[]
): RouteRule => {
  const when = serializeCondition(condition);
  // Leave the default action implicit on rules that never set it.
  const writeAction = base.action !== undefined || action !== DEFAULT_ROUTING_ACTION;
  const writeTelemetry =
    base.telemetry !== undefined || !sameSignals(telemetry, supportedTelemetry);
  const rule: RouteRule = { ...base };
  delete rule.when;
  delete rule.action;
  delete rule.telemetry;
  if (when !== undefined) {
    rule.when = when;
  }
  if (writeAction) {
    rule.action = action;
  }
  if (writeTelemetry) {
    rule.telemetry = supportedTelemetry.filter((signal) => telemetry.includes(signal));
  }
  return rule;
};

/** A new routing node starts with one rule with no condition that keeps the line's destination. */
export const getNewRoutingNodeRules = (line: UnitRoutableLine): RouteRule[] => [
  { destinations: [line.destinationId] },
];

export const routingFlyoutMachine = setup({
  types: {
    input: {} as RoutingFlyoutInput,
    context: {} as RoutingFlyoutContext,
    events: {} as RoutingFlyoutEvent,
  },
  actions: {
    addRule: assign(({ context }) => {
      const added: RoutingRuleDraft = {
        key: `rule-${context.nextKey}`,
        condition: createEmptyCondition(),
        action: DEFAULT_ROUTING_ACTION,
        telemetry: [...context.signals],
        // Rules added here route nowhere until they are connected on the canvas.
        base: { destinations: [] },
      };
      const rules = [...context.rules];
      // Insert above a trailing rule with no condition, so it stays last.
      const endsWithCatchAll = rules.length > 0 && rules[rules.length - 1].condition === undefined;
      rules.splice(endsWithCatchAll ? rules.length - 1 : rules.length, 0, added);
      return { rules, nextKey: context.nextKey + 1, hasChanges: true };
    }),
    updateRule: assign(({ context, event }) =>
      event.type === 'rule.update'
        ? {
            rules: context.rules.map((rule) =>
              rule.key === event.key ? { ...rule, ...event.changes } : rule
            ),
            hasChanges: true,
          }
        : {}
    ),
    deleteRule: assign(({ context, event }) =>
      event.type === 'rule.delete'
        ? { rules: context.rules.filter(({ key }) => key !== event.key), hasChanges: true }
        : {}
    ),
    reorderRule: assign(({ context, event }) => {
      if (event.type !== 'rule.reorder') {
        return {};
      }
      const rules = [...context.rules];
      const [moved] = rules.splice(event.from, 1);
      rules.splice(event.to, 0, moved);
      return { rules, hasChanges: true };
    }),
    clearSaveError: assign({ saveError: undefined }),
    storeSaveFailure: assign(({ event }) =>
      event.type === 'save.failed' ? { saveError: event.message } : {}
    ),
    requestSave: sendTo(
      ({ context }) => context.parentRef,
      ({ context }): RoutingSaveRequest => {
        const supportedTelemetry = getRulesTelemetry(context.rules, context.availableSignals);
        return {
          type: 'routing.save',
          target: context.target,
          rules: context.rules.map((rule) => toRouteRule(rule, supportedTelemetry)),
          supportedTelemetry,
        };
      }
    ),
  },
  guards: {
    canEdit: ({ context }) => context.editable,
    // The rule with no condition stays last, so it keeps whatever the rules above it do not match.
    canReorder: ({ context, event }) => {
      if (event.type !== 'rule.reorder' || !context.editable) {
        return false;
      }
      const { rules } = context;
      const { from, to } = event;
      const lastIndex = rules.length - 1;
      if (from === to || from < 0 || to < 0 || from > lastIndex || to > lastIndex) {
        return false;
      }
      const endsWithCatchAll = rules[lastIndex].condition === undefined;
      return rules[from].condition !== undefined && !(endsWithCatchAll && to === lastIndex);
    },
    // A new routing node can be created as it starts, with its catch-all rule.
    canSave: ({ context }) =>
      context.editable &&
      context.rules.length > 0 &&
      context.rules.every(({ telemetry }) => telemetry.length > 0) &&
      (context.hasChanges || context.target.kind === 'line'),
  },
}).createMachine({
  id: 'routingFlyout',
  context: ({ input }) => ({
    target: input.target,
    rules: input.rules.map(toDraft(input.signals)),
    signals: input.signals,
    availableSignals: input.availableSignals,
    editable: input.editable,
    hasChanges: false,
    saveError: undefined,
    nextKey: input.rules.length,
    parentRef: input.parentRef,
  }),
  initial: 'idle',
  states: {
    idle: {
      on: {
        'rule.add': { guard: 'canEdit', actions: 'addRule' },
        'rule.update': { guard: 'canEdit', actions: 'updateRule' },
        'rule.delete': { guard: 'canEdit', actions: 'deleteRule' },
        'rule.reorder': { guard: 'canReorder', actions: 'reorderRule' },
        'flyout.save': { guard: 'canSave', target: 'saving' },
      },
    },
    saving: {
      entry: ['clearSaveError', 'requestSave'],
      on: {
        'save.succeeded': { target: 'saved' },
        'save.failed': { target: 'idle', actions: 'storeSaveFailure' },
      },
    },
    saved: {
      type: 'final',
    },
  },
});

export type RoutingFlyoutActorRef = ActorRefFrom<typeof routingFlyoutMachine>;
