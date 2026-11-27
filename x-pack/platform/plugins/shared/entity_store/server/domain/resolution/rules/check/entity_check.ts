/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { ENTITY_ID_FIELD } from '../../../../../common/domain/definitions/common_fields';
import { escapeEsqlStringLiteral } from '../../../../../common/esql/strings';
import { executeEsqlQuery } from '../../../../infra/elasticsearch/esql';
import { EntitiesNotFoundError } from '../../../errors/entities_not_found_error';
import {
  RESOLUTION_RULE_CONFIGS,
  type EsqlFieldMatchSpec,
  type ResolutionRuleConfig,
} from '../rule_registry';
import type { EffectiveResolutionRule } from '../rule_client';
import {
  ENGINE_METADATA_TYPE_FIELD,
  ENTITY_NAMESPACE_FIELD,
  ENTITY_TYPE,
  GROUP_SIZE_CEILING,
  RESOLVED_TO_FIELD,
} from '../matcher/constants';
import {
  buildMatchGroupsQuery,
  classifyMatchGroup,
  fetchEntities as defaultFetchEntities,
  parseMatchGroupRows,
  planMatchGroupLink,
} from '../matcher';
import type { AutomatedResolutionState } from '../maintainers/automated_resolution/types';
import type { EntityRuleCheck, EntityRuleCheckResult } from './types';

const NULLIFY_UNMAPPED_FIELDS_SETTING = 'SET unmapped_fields="nullify";';
const NAMESPACE_COUNT_COLUMN = 'entity_count';
const LOCAL_NAMESPACE = 'local';

interface RuleDataNeed {
  mode: 'any' | 'all';
  namespaces: readonly string[];
  label: string;
}

/**
 * What a rule needs in the store before it can link anything. Taken from the rule
 * descriptions in `rule_registry.ts` (the Windows SID and Entra GUID rules).
 */
const RULE_DATA_NEEDS: Readonly<Record<string, RuleDataNeed>> = {
  windows_sid_bridge: {
    mode: 'any',
    namespaces: ['local', 'system', 'windows'],
    label: 'Windows or CrowdStrike endpoint events that create local user entities',
  },
  entra_guid_bridge: {
    mode: 'all',
    namespaces: ['m365_defender', 'entra_id'],
    label: 'Defender identity events and Entra entity analytics',
  },
};

export interface EntityRuleCheckDeps {
  esClient: ElasticsearchClient;
  /** The latest-entities index for the space. */
  index: string;
  rules: readonly EffectiveResolutionRule[];
  /** The saved state of the automated-resolution task, when it exists. */
  maintainerState: AutomatedResolutionState | null;
  signal?: AbortSignal;
  /** Test seams. */
  runEsql?: (query: string) => Promise<ESQLSearchResponse>;
  fetchEntities?: typeof defaultFetchEntities;
}

const quote = (value: string): string => `"${escapeEsqlStringLiteral(value)}"`;

const toArray = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  return (Array.isArray(value) ? value : [value])
    .filter((item) => item != null)
    .map((item) => String(item));
};

const firstRowAsRecord = (response: ESQLSearchResponse): Record<string, unknown> | null => {
  const [row] = response.values;
  if (!row) {
    return null;
  }
  return Object.fromEntries(response.columns.map((column, index) => [column.name, row[index]]));
};

const matchFieldsOf = (spec: EsqlFieldMatchSpec): string[] =>
  spec.fieldByNamespace ? Object.values(spec.fieldByNamespace) : [spec.field];

const matchFieldFor = (spec: EsqlFieldMatchSpec, namespace: string): string | undefined =>
  spec.fieldByNamespace ? spec.fieldByNamespace[namespace] : spec.field;

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

/**
 * Checks every built-in resolution rule against one entity and says, per rule, whether it is
 * failing, has no data, declined the entity's group, would link it, or does not apply.
 * Read-only: it runs the same group query and checks as the automated maintainer, for one value.
 * Custom rules and the related-user alias rule are not covered yet.
 */
export const checkEntityRules = async (
  entityId: string,
  deps: EntityRuleCheckDeps
): Promise<EntityRuleCheck> => {
  const { esClient, index, rules, maintainerState, signal } = deps;
  const runEsql =
    deps.runEsql ?? ((query: string) => executeEsqlQuery({ esClient, query, signal }));
  const fetchEntities = deps.fetchEntities ?? defaultFetchEntities;

  const matchFields = Array.from(
    new Set(
      RESOLUTION_RULE_CONFIGS.flatMap(({ matcher }) => (matcher ? matchFieldsOf(matcher) : []))
    )
  );

  const entityResponse = await runEsql(
    [
      NULLIFY_UNMAPPED_FIELDS_SETTING,
      `FROM ${quote(index)}`,
      `| WHERE ${ENTITY_ID_FIELD} == ${quote(entityId)}`,
      `| KEEP ${[
        ENTITY_ID_FIELD,
        ENGINE_METADATA_TYPE_FIELD,
        ENTITY_NAMESPACE_FIELD,
        RESOLVED_TO_FIELD,
        ...matchFields,
      ].join(', ')}`,
      '| LIMIT 1',
    ].join('\n')
  );
  const entityRow = firstRowAsRecord(entityResponse);
  if (!entityRow) {
    throw new EntitiesNotFoundError([entityId]);
  }

  const entityType = toArray(entityRow[ENGINE_METADATA_TYPE_FIELD])[0] ?? '';
  const namespace = toArray(entityRow[ENTITY_NAMESPACE_FIELD])[0] ?? '';
  const resolvedTo = toArray(entityRow[RESOLVED_TO_FIELD])[0] ?? null;

  let namespaceCounts: Map<string, number> | undefined;
  const getNamespaceCounts = async (): Promise<Map<string, number>> => {
    if (namespaceCounts) {
      return namespaceCounts;
    }
    const response = await runEsql(
      [
        NULLIFY_UNMAPPED_FIELDS_SETTING,
        `FROM ${quote(index)}`,
        `| WHERE ${ENGINE_METADATA_TYPE_FIELD} == ${quote(ENTITY_TYPE)}`,
        `| STATS ${NAMESPACE_COUNT_COLUMN} = COUNT(*) BY ${ENTITY_NAMESPACE_FIELD}`,
      ].join('\n')
    );
    const namespaceIndex = response.columns.findIndex(
      ({ name }) => name === ENTITY_NAMESPACE_FIELD
    );
    const countIndex = response.columns.findIndex(({ name }) => name === NAMESPACE_COUNT_COLUMN);
    namespaceCounts = new Map(
      response.values.map((row) => [String(row[namespaceIndex]), Number(row[countIndex])])
    );
    return namespaceCounts;
  };

  const matchesPattern = async (value: string, pattern: string): Promise<boolean> => {
    const response = await runEsql(`ROW v = ${quote(value)}\n| WHERE v RLIKE ${quote(pattern)}`);
    return response.values.length > 0;
  };

  const checkRule = async (config: ResolutionRuleConfig): Promise<EntityRuleCheckResult> => {
    const result = (
      status: EntityRuleCheckResult['status'],
      reason: string,
      extra: Partial<EntityRuleCheckResult> = {}
    ): EntityRuleCheckResult => ({ rule_id: config.id, status, reason, details: [], ...extra });

    const effective = rules.find(({ id }) => id === config.id);
    if (!effective?.enabled) {
      return result(
        'off',
        config.defaultEnabled ? 'Switched off for this space.' : 'Off by default for this rule.'
      );
    }

    const spec = config.matcher;
    if (!spec) {
      return result(
        'not_applicable',
        'This rule uses a different kind of query, which this check does not run yet.'
      );
    }
    if (entityType !== ENTITY_TYPE) {
      return result('not_applicable', 'Resolution rules only cover user entities.');
    }
    if (spec.namespaces.length > 0 && !spec.namespaces.includes(namespace)) {
      return result(
        'not_applicable',
        `Covers ${spec.namespaces.join(', ')}. This entity is in ${namespace}.`
      );
    }

    const ruleState = maintainerState?.rules?.[config.id];
    const failures =
      typeof ruleState?.consecutiveFailures === 'number' ? ruleState.consecutiveFailures : 0;
    if (failures > 0) {
      return result(
        'failing',
        'This rule is failing, so it cannot link entities like this one right now.',
        {
          failure: {
            last_error: typeof ruleState?.lastError === 'string' ? ruleState.lastError : null,
            consecutive_failures: failures,
            next_attempt_at:
              typeof ruleState?.nextAttemptAt === 'string' ? ruleState.nextAttemptAt : null,
          },
        }
      );
    }

    const need = RULE_DATA_NEEDS[config.id];
    if (need) {
      const counts = await getNamespaceCounts();
      const missing = need.namespaces.filter((name) => (counts.get(name) ?? 0) === 0);
      const lacking =
        need.mode === 'all' ? missing.length > 0 : missing.length === need.namespaces.length;
      if (lacking) {
        return result(
          'no_data',
          `This rule needs ${need.label}, but the store has no entities from: ${missing.join(
            ', '
          )}.`
        );
      }
    }

    const field = matchFieldFor(spec, namespace);
    const values = field ? toArray(entityRow[field]) : [];
    if (!field || values.length === 0) {
      return result(
        'not_applicable',
        `This entity has no ${field ?? 'matching'} value for this rule to use.`
      );
    }
    if (values.length > 1) {
      return result(
        'not_applicable',
        `This entity has ${values.length} values in ${field}. The rule needs exactly one.`
      );
    }

    const [value] = values;
    if (spec.inclusionPattern && !(await matchesPattern(value, spec.inclusionPattern))) {
      const caseHint = (await matchesPattern(value.toUpperCase(), spec.inclusionPattern))
        ? ' It would match in upper case, and the match is case sensitive.'
        : '';
      return result(
        'not_applicable',
        `The value in ${field} does not match the pattern this rule accepts.${caseHint}`
      );
    }
    if (spec.exclusionPattern && (await matchesPattern(value, spec.exclusionPattern))) {
      return result('not_applicable', 'A well-known value that this rule deliberately skips.');
    }

    const matchValue = spec.lowercase ? value.toLowerCase() : value;
    const groupResponse = await runEsql(
      buildMatchGroupsQuery({ index, spec, matchValues: [matchValue], pageSize: 1 })
    );
    const [row] = parseMatchGroupRows(groupResponse);
    if (!row) {
      return result(
        'nothing_to_link',
        'No other entity shares this value, or the group is already fully linked.'
      );
    }

    const details = [
      `${row.groupSize} ${plural(row.groupSize, 'entity shares', 'entities share')} this value`,
    ];
    const verdict = classifyMatchGroup(row, spec.declineSameNamespaceDuplicates !== false);

    if (verdict === 'oversized') {
      return result(
        'declined',
        `The group has ${row.groupSize} entities, over the limit of ${GROUP_SIZE_CEILING}, so the rule declines it.`,
        { details }
      );
    }
    if (verdict === 'same_namespace_duplicates') {
      const nonLocalCount = row.unresolvedCount - row.unresolvedLocalCount;
      const sourceCount = new Set(
        row.unresolvedNamespaces.filter((name) => name !== LOCAL_NAMESPACE)
      ).size;
      return result(
        'declined',
        `Ambiguous: ${nonLocalCount} entities from ${sourceCount} ${plural(
          sourceCount,
          'source',
          'sources'
        )}, so two share a source and the rule cannot tell which is right.`,
        { details }
      );
    }
    if (verdict === 'nothing_to_link') {
      return result('nothing_to_link', 'Nothing to link: fewer than two entities can be linked.', {
        details,
      });
    }

    const ids = Array.from(new Set([...row.unresolvedIds, ...row.existingTargetIds]));
    const entities = await fetchEntities(esClient, index, ids);
    const plan = planMatchGroupLink(row, entities);
    if (!plan || plan.aliasIds.length === 0) {
      return result('nothing_to_link', 'These entities are already linked.', { details });
    }
    return result(
      'would_link',
      `Would link ${plan.aliasIds.length} other ${plural(
        plan.aliasIds.length,
        'entity',
        'entities'
      )} onto ${plan.target.entityId}.`,
      { details, target_id: plan.target.entityId, would_link_ids: plan.aliasIds }
    );
  };

  const results: EntityRuleCheckResult[] = [];
  for (const config of RESOLUTION_RULE_CONFIGS) {
    signal?.throwIfAborted();
    results.push(await checkRule(config));
  }

  const needsAttention = results.filter(({ status }) =>
    ['failing', 'no_data', 'declined'].includes(status)
  ).length;
  const wouldLink = results.filter(({ status }) => status === 'would_link').length;
  const applied = results.filter(({ status }) =>
    ['would_link', 'nothing_to_link'].includes(status)
  ).length;

  return {
    entity_id: entityId,
    entity_namespace: namespace,
    entity_type: entityType,
    resolved_to: resolvedTo,
    summary: {
      needs_attention: needsAttention,
      would_link: wouldLink,
      applied,
      healthy: needsAttention === 0,
    },
    rules: results,
  };
};
