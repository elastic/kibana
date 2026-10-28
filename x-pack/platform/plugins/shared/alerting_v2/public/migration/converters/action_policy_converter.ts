/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'yaml';
import { getInlineActionStepDefinition } from '@kbn/alerting-v2-rule-form';
import type {
  ActionMigrationNote,
  ClassicRuleAction,
  DefaultActionPolicy,
  MigratedActionPolicy,
  SkippedClassicAction,
} from '../types';
import { getNonEmptyString, isRecord } from './utils';

const RECOVERED_ACTION_GROUP = 'recovered';
const MUSTACHE_PATTERN = /\{\{/;
const RULE_NAME_PATTERN = /\{\{\{?\s*rule\.name\s*\}?\}\}/g;

type Delivery = Pick<MigratedActionPolicy['policy'], 'grouping' | 'throttle'>;

/** Routing tag that ties a migrated rule to the action policies created alongside it. */
export const getMigrationRoutingTag = (classicRuleId: string): string =>
  `migrated-rule:${classicRuleId}`;

const getStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];

/** Reads a field from the default params of an inline step, which hold the alert summary templates. */
const getDefaultTemplate = (stepType: MigratedActionPolicy['stepType'], field: string): string => {
  const template = getInlineActionStepDefinition(stepType)?.paramsTemplate;
  const parsed: unknown = template ? parse(template) : undefined;
  return isRecord(parsed) ? getNonEmptyString(parsed[field]) ?? '' : '';
};

/**
 * Classic actions use mustache over `context.*`; workflows use liquid over `inputs.payload`.
 * The rule name is the only variable with a fixed value, so it is inlined and any other
 * template falls back to the rule type's default message, or the step's default alert summary.
 */
const convertTemplate = (
  value: unknown,
  ruleName: string,
  fallback: string
): { text: string; replaced: boolean } => {
  const text = getNonEmptyString(value);
  if (!text) return { text: fallback, replaced: false };
  const withRuleName = text.replace(RULE_NAME_PATTERN, ruleName);
  return MUSTACHE_PATTERN.test(withRuleName)
    ? { text: fallback, replaced: true }
    : { text: withRuleName, replaced: false };
};

/** Maps a classic action frequency onto action policy grouping and throttling. */
const getDelivery = (frequency: ClassicRuleAction['frequency']): Delivery => {
  const notifyWhen = frequency?.notifyWhen ?? 'onActionGroupChange';
  const interval = frequency?.throttle ?? undefined;

  if (!frequency?.summary) {
    if (notifyWhen === 'onActiveAlert') {
      return { grouping: { mode: 'per_alert' }, throttle: { strategy: 'every_time' } };
    }
    if (notifyWhen === 'onThrottleInterval' && interval) {
      return {
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'per_status_interval', interval },
      };
    }
    return { grouping: { mode: 'per_alert' }, throttle: { strategy: 'on_status_change' } };
  }

  if (notifyWhen === 'onThrottleInterval' && interval) {
    return { grouping: { mode: 'all' }, throttle: { strategy: 'time_interval', interval } };
  }
  return { grouping: { mode: 'all' }, throttle: { strategy: 'every_time' } };
};

interface StepConversion {
  stepType: MigratedActionPolicy['stepType'];
  connectorId: string | null;
  params: Record<string, unknown>;
  notes: ActionMigrationNote[];
}

interface ConversionContext {
  ruleName: string;
  defaultActionPolicy?: DefaultActionPolicy;
}

const convertEmail = (
  action: ClassicRuleAction,
  { ruleName, defaultActionPolicy }: ConversionContext
): StepConversion => {
  const { params } = action;
  const subject = convertTemplate(
    params.subject,
    ruleName,
    defaultActionPolicy?.subject ?? `[${ruleName}] Alert`
  );
  const message = convertTemplate(
    params.message,
    ruleName,
    defaultActionPolicy?.message ?? getDefaultTemplate('email', 'message')
  );
  const cc = getStrings(params.cc);
  const bcc = getStrings(params.bcc);

  return {
    stepType: 'email',
    connectorId: action.id,
    params: {
      to: getStrings(params.to),
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      subject: subject.text,
      message: message.text,
    },
    notes: subject.replaced || message.replaced ? ['templates_replaced'] : [],
  };
};

const getSlackApiChannel = (subActionParams: Record<string, unknown>): string =>
  getStrings(subActionParams.channelIds)[0] ??
  getStrings(subActionParams.channels)[0] ??
  getStrings(subActionParams.channelNames)[0] ??
  '';

const convertSlack = (
  action: ClassicRuleAction,
  { ruleName, defaultActionPolicy }: ConversionContext
): StepConversion => {
  const { params, actionTypeId } = action;
  const subActionParams = isRecord(params.subActionParams) ? params.subActionParams : params;
  const isSlackV2 = actionTypeId === '.slack2';
  const channel = isSlackV2
    ? getNonEmptyString(subActionParams.channel) ?? ''
    : getSlackApiChannel(subActionParams);
  const text = convertTemplate(
    subActionParams.text,
    ruleName,
    defaultActionPolicy?.message ?? getDefaultTemplate('slack2.sendMessage', 'text')
  );

  const notes: ActionMigrationNote[] = [];
  if (text.replaced) notes.push('templates_replaced');
  if (!isSlackV2) notes.push('connector_required');

  return {
    stepType: 'slack2.sendMessage',
    connectorId: isSlackV2 ? action.id : null,
    params: { channel, text: text.text },
    notes,
  };
};

const STEP_CONVERTERS: Record<
  string,
  (action: ClassicRuleAction, context: ConversionContext) => StepConversion
> = {
  '.email': convertEmail,
  '.slack_api': convertSlack,
  '.slack2': convertSlack,
};

const getStepLabel = (stepType: MigratedActionPolicy['stepType']): string =>
  getInlineActionStepDefinition(stepType)?.label ?? stepType;

/**
 * Converts classic rule actions to simple action policies: one single-step workflow per
 * action, matched to the migrated rule through its routing tag.
 */
export const convertClassicActions = ({
  actions,
  ruleName,
  routingTag,
  defaultActionPolicy,
}: {
  actions: ClassicRuleAction[];
  ruleName: string;
  routingTag: string;
  defaultActionPolicy?: DefaultActionPolicy;
}): { actionPolicies: MigratedActionPolicy[]; skippedActions: SkippedClassicAction[] } => {
  const actionPolicies: MigratedActionPolicy[] = [];
  const skippedActions: SkippedClassicAction[] = [];

  for (const action of actions) {
    const sourceActionId = action.uuid ?? action.id;
    const converter = STEP_CONVERTERS[action.actionTypeId];

    if (!converter) {
      skippedActions.push({
        sourceActionId,
        sourceConnectorTypeId: action.actionTypeId,
        reason: 'unsupported_connector',
      });
      continue;
    }
    if (action.group === RECOVERED_ACTION_GROUP) {
      skippedActions.push({
        sourceActionId,
        sourceConnectorTypeId: action.actionTypeId,
        reason: 'recovery_group',
      });
      continue;
    }

    const { stepType, connectorId, params, notes } = converter(action, {
      ruleName,
      defaultActionPolicy,
    });
    actionPolicies.push({
      sourceActionId,
      sourceConnectorId: action.id,
      sourceConnectorTypeId: action.actionTypeId,
      stepType,
      connectorId,
      params: stringify(params),
      policy: {
        name: `${ruleName} · ${getStepLabel(stepType)}`,
        description: `Migrated from an action on the classic rule "${ruleName}".`,
        matcher: { tags: [routingTag] },
        ...getDelivery(action.frequency),
      },
      notes: action.alertsFilter ? [...notes, 'alerts_filter_dropped'] : notes,
    });
  }

  return { actionPolicies, skippedActions };
};
