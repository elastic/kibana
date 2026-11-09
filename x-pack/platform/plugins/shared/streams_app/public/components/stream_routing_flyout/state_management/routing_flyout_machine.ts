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
  /** Whether the flyout can edit these rules; telemetry-scoped rule lists cannot be. */
  editable: boolean;
  /** Whether the user cannot manage the stream, so nothing can be edited or saved. */
  readOnly?: boolean;
  parentRef: AnyActorRef;
}

export interface RoutingFlyoutContext {
  target: RoutingFlyoutTarget;
  rules: RoutingRuleDraft[];
  signals: UnitSignal[];
  availableSignals: UnitSignal[];
  /** False when the rules cannot be edited here, or the user cannot manage the stream. */
  editable: boolean;
  readOnly: boolean;
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

/**
 * Whether the rule moves all remaining data, having no condition once saved. A
 * copy rule with no condition passes the data on, so it can sit anywhere.
 */
export const isDefaultRule = ({ condition, action }: RoutingRuleDraft): boolean =>
  action === 'move' && serializeCondition(condition) === undefined;

/**
 * Rules with conditions first, then the default rules, each in their current
 * order. A default rule above a conditional one would take its data.
 */
const withDefaultsLast = (rules: readonly RoutingRuleDraft[]): RoutingRuleDraft[] => [
  ...rules.filter((rule) => !isDefaultRule(rule)),
  ...rules.filter(isDefaultRule),
];

/** Where the trailing default rules start; the rules list's length when there are none. */
const defaultSectionStart = (rules: readonly RoutingRuleDraft[]): number => {
  let start = rules.length;
  while (start > 0 && isDefaultRule(rules[start - 1])) {
    start -= 1;
  }
  return start;
};

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
      // Insert above the default rules, so they stay last.
      rules.splice(defaultSectionStart(rules), 0, added);
      return { rules, nextKey: context.nextKey + 1, hasChanges: true };
    }),
    updateRule: assign(({ context, event }) => {
      if (event.type !== 'rule.update') {
        return {};
      }
      const updated = context.rules.find(({ key }) => key === event.key);
      if (!updated) {
        return {};
      }
      const next: RoutingRuleDraft = { ...updated, ...event.changes };
      const others = context.rules.filter(({ key }) => key !== event.key);
      if (serializeCondition(next.condition) === undefined) {
        // A cleared condition leaves no condition; a move rule then joins the default rules at the end.
        const cleared = { ...next, condition: undefined };
        return {
          rules: isDefaultRule(cleared)
            ? [...others, cleared]
            : context.rules.map((rule) => (rule.key === event.key ? cleared : rule)),
          hasChanges: true,
        };
      }
      return {
        rules: context.rules.map((rule) => (rule.key === event.key ? next : rule)),
        hasChanges: true,
      };
    }),
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
          rules: withDefaultsLast(context.rules).map((rule) =>
            toRouteRule(rule, supportedTelemetry)
          ),
          supportedTelemetry,
        };
      }
    ),
  },
  guards: {
    canEdit: ({ context }) => context.editable,
    // Default rules stay last, so they keep whatever the rules above them do not match.
    canReorder: ({ context, event }) => {
      if (event.type !== 'rule.reorder' || !context.editable) {
        return false;
      }
      const { rules } = context;
      const { from, to } = event;
      const conditionalCount = defaultSectionStart(rules);
      return (
        from !== to && from >= 0 && to >= 0 && from < conditionalCount && to < conditionalCount
      );
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
    editable: input.editable && !input.readOnly,
    readOnly: input.readOnly ?? false,
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
