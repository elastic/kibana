/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlQuery, Builder } from '@kbn/esql-ast';
import { v4 as uuidv4 } from 'uuid';
import type { SanitizedRule } from '../../../types';
import type { RulesClientContext } from '../../../rules_client';
import type { CreateRuleData } from './create';
import { createRule } from './create';
import type { RuleParamsV1 } from '../../../../common/routes/rule/response';
import { concat } from 'lodash';

async function createRecoveryRule(
  context: RulesClientContext,
  parentRuleId: string,
  recoveryRuleId: string,
  ruleData: CreateRuleData<RuleParamsV1>,
  track: {
    recovery?: {
      enabled?: boolean;
      schedule?: string;
      lookbackWindow?: string;
      recoveryQuery?: string;
    };
  }
) {
  if (!track?.recovery?.enabled) {
    return;
  }

  try {
    let recoveryEsql: string;

    if (track.recovery.recoveryQuery) {
      const groupKeys = ruleData.params.group_key ?? [];
      const groupKeyFields = groupKeys.map((key) => `attrs.${key}`).join(', ');
      const groupKeyConditions = groupKeys.map((key) => `attrs.${key} IS NOT NULL`).join(' AND ');

      recoveryEsql = track.recovery.recoveryQuery
        .replace(/\?rule_id/g, `"${parentRuleId}"`)
        .replace(/\?group_key_fields/g, groupKeyFields)
        .replace(/\?group_key_conditions/g, groupKeyConditions);
    } else {
      const groupKeys = ruleData.params.group_key ?? [];
      if (groupKeys.length === 0) {
        context.logger.error(
          `Cannot create recovery rule for parent rule "${ruleData.name}" (${parentRuleId}) because 'group_key' is not defined.`
        );
        return;
      }

      const groupKeyColumns = groupKeys.map((key) =>
        Builder.expression.column(['attrs', ...key.split('.')])
      );

      const fromCommand = Builder.command({
        name: 'from',
        args: [Builder.expression.literal.string('.internal.alerts-stack.alerts-default-*')],
      });

      const initialWhereCommand = Builder.command({
        name: 'where',
        args: [
          Builder.expression.func.binary('==', [
            Builder.expression.column(['rule', 'id']),
            Builder.expression.literal.string(parentRuleId),
          ]),
        ],
      });

      const statsCommand = Builder.command({
        name: 'stats',
        args: [
          Builder.expression.func.binary('=', [
            Builder.identifier('last_seen_run_id'),
            Builder.expression.func.call('MAX', [Builder.expression.column(['run', 'id'])]),
          ]),
          Builder.option({
            name: 'by',
            args: [Builder.expression.column(['rule', 'id']), ...groupKeyColumns],
          }),
        ],
      });

      const inlineStatsCommand = Builder.command({
        name: 'INLINE STATS',
        args: [
          Builder.expression.func.binary('=', [
            Builder.identifier('max_run_id'),
            Builder.expression.func.call('MAX', [Builder.expression.column('last_seen_run_id')]),
          ]),
        ],
      });

      const notNullConditions = groupKeyColumns.map((col) =>
        Builder.expression.func.postfix('IS NOT NULL', col)
      );
      const combinedNotNullCondition = notNullConditions.reduce((acc, condition) =>
        Builder.expression.func.binary('AND', [acc, condition])
      );

      const secondaryWhereCondition = Builder.expression.func.binary('AND', [
        Builder.expression.func.binary('<', [
          Builder.expression.column('last_seen_run_id'),
          Builder.expression.column('max_run_id'),
        ]),
        combinedNotNullCondition,
      ]);

      const secondaryWhereCommand = Builder.command({
        name: 'where',
        args: [secondaryWhereCondition],
      });

      const evalCommand = Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.identifier('status'),
            Builder.expression.literal.string('recovered'),
          ]),
        ],
      });

      const evalParentIdCommand = Builder.command({
        name: 'EVAL',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(['rule', 'parent_id']),
            Builder.expression.literal.string(parentRuleId),
          ]),
        ],
      });

      const keepCommand = Builder.command({
        name: 'keep',
        args: [
          ...groupKeyColumns,
          Builder.expression.column('status'),
          Builder.expression.column('last_seen_run_id'),
          Builder.expression.column('max_run_id'),
          Builder.expression.column(['rule', 'parent_id']),
        ],
      });

      const recoveryAst = Builder.expression.query([
        fromCommand,
        initialWhereCommand,
        statsCommand,
        inlineStatsCommand,
        secondaryWhereCommand,
        evalCommand,
        evalParentIdCommand,
        keepCommand,
      ]);

      const recoveryEsqlQuery = new EsqlQuery(recoveryAst);
      recoveryEsql = recoveryEsqlQuery.print();
    }

    const recoveryLookbackWindow =
      track.recovery.lookbackWindow ||
      `${ruleData.params.timeWindowSize}${ruleData.params.timeWindowUnit}`;
    const durationMatch = recoveryLookbackWindow.match(/^(\d+)([smhd])$/);
    const timeWindowSize = durationMatch
      ? parseInt(durationMatch[1], 10)
      : ruleData.params.timeWindowSize;
    const timeWindowUnit = durationMatch ? durationMatch[2] : ruleData.params.timeWindowUnit;

    const recoveryRuleData: CreateRuleData<RuleParamsV1> = {
      ...ruleData,
      name: `${ruleData.name} - RECOVERY`,
      tags: [...(ruleData.tags || []), 'internal'],
      internal: true,
      schedule: {
        interval: track.recovery.schedule || ruleData.schedule.interval,
      },
      artifacts: {
        ...ruleData.artifacts,
        rules: [...(ruleData.artifacts?.rules ?? []), { id: parentRuleId }],
      },
      params: {
        ...ruleData.params,
        parentId: parentRuleId,
        role: 'recovery',
        esqlQuery: {
          esql: recoveryEsql,
        },
        timeWindowSize,
        timeWindowUnit,
      },
    };
    return createRule(context, { data: recoveryRuleData, options: { id: recoveryRuleId } });
  } catch (e) {
    context.logger.error(`Failed to create recovery rule for parent rule ${parentRuleId}.`, e);
    // Re-throw the error to ensure the API call fails
    throw e;
  }
}

export async function createESQLRule(
  context: RulesClientContext,
  ruleData: CreateRuleData<RuleParamsV1>,
  track?: {
    recovery?: {
      enabled?: boolean;
      schedule?: string;
      lookbackWindow?: string;
      recoveryQuery?: string;
    };
  }
): Promise<Array<SanitizedRule<RuleParamsV1>>> {
  const parentRuleId = uuidv4();
  const recoveryRuleId = uuidv4();

  const ruleDataWithId = {
    ...ruleData,
    alertTypeId: '.esql',
    artifacts: {
      ...ruleData.artifacts,
      rules: concat(
        [...(ruleData.artifacts?.rules?.map((rule) => ({ id: rule.id })) ?? [])],
        track?.recovery ? [{ id: recoveryRuleId }] : []
      ).filter(Boolean),
    },
  };

  console.log('ruleDataWithId', JSON.stringify(ruleDataWithId, null, 2));

  const createPromises: [
    Promise<SanitizedRule<RuleParamsV1>>,
    Promise<SanitizedRule<RuleParamsV1>>?
  ] = [createRule(context, { data: ruleDataWithId, options: { id: parentRuleId } })];

  if (track?.recovery?.enabled) {
    createPromises.push(createRecoveryRule(context, parentRuleId, recoveryRuleId, ruleData, track));
  }

  const createdRules = await Promise.all(createPromises);

  return createdRules.filter((rule): rule is SanitizedRule<RuleParamsV1> => !!rule);
}
