/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { checkBuilderParams, type RuleBuilderType } from '@kbn/alerting-v2-rule-builders';
import type { RuleAttachmentData, RuleKind } from '@kbn/alerting-v2-schemas';
import { getBreachEsqlQuery, getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import {
  assertRuleReadyToSave,
  executeRuleOperations,
  RuleOperationValidationError,
  validateEsqlQuery,
  warnOnBackingIndices,
  type EsqlColumn,
  type RuleSettingsOperation,
} from '../rule_operations/operations';
import { getDateFieldsForQuery } from '../rule_operations/resolve_time_field';

/** Used when neither the rule nor the settings choose a kind or schedule. */
export const BUILDER_RULE_DEFAULTS = {
  kind: 'alert',
  schedule: { every: '5m' },
} as const;

export interface ApplyBuilderParamsOptions {
  readonly builder: RuleBuilderType;
  readonly current: Partial<RuleAttachmentData>;
  /** Unchecked params; parsed with the builder's schema before use. */
  readonly params: unknown;
  readonly settings: readonly RuleSettingsOperation[];
  readonly isNew: boolean;
  readonly esClient?: IScopedClusterClient;
  readonly savedObjectsClient: SavedObjectsClientContract;
}

export interface ApplyBuilderParamsResult {
  readonly data: Partial<RuleAttachmentData>;
  /** The params after parsing, with the builder's defaults applied. */
  readonly params: unknown;
  readonly queryColumns?: EsqlColumn[];
  readonly warnings?: string[];
}

const resolveKind = (
  current: Partial<RuleAttachmentData>,
  settings: readonly RuleSettingsOperation[]
): RuleKind =>
  settings.reduce<RuleKind | undefined>(
    (kind, operation) => (operation.operation === 'set_kind' ? operation.kind : kind),
    current.kind
  ) ?? BUILDER_RULE_DEFAULTS.kind;

/** Fails when the generated query's time field isn't a date field on its source index. */
const assertTimeFieldExists = async (
  esClient: IScopedClusterClient,
  rootQuery: string,
  timeField: string
): Promise<void> => {
  const dateFields = await getDateFieldsForQuery(esClient, rootQuery);
  // Lookups that fail (federated sources, views) can't be verified.
  if (!dateFields || dateFields.includes(timeField)) {
    return;
  }
  throw new RuleOperationValidationError(
    dateFields.length > 0
      ? `The time field "${timeField}" is not a \`date\` or \`date_nanos\` field on the index. Available date fields: ${dateFields
          .sort()
          .map((field) => `"${field}"`)
          .join(', ')}.`
      : `The index has no \`date\` or \`date_nanos\` field, which the rule's lookback window requires.`
  );
};

/**
 * Generates a rule's query, time field, grouping and recovery from builder params, then
 * applies the settings operations and checks the result against Elasticsearch and the
 * create API schema. Builder-owned fields the params no longer produce are removed.
 */
export const applyBuilderParams = async ({
  builder,
  current,
  params,
  settings,
  isNew,
  esClient,
  savedObjectsClient,
}: ApplyBuilderParamsOptions): Promise<ApplyBuilderParamsResult> => {
  const checked = checkBuilderParams(builder, params);
  if (!checked.valid) {
    throw new RuleOperationValidationError(
      `Invalid ${builder.title} params:\n${checked.errors.map((error) => `- ${error}`).join('\n')}`
    );
  }

  const kind = resolveKind(current, settings);
  const parts = builder.build(checked.params, { kind });
  const generated: Partial<RuleAttachmentData> = {
    ...omit(current, ['grouping', 'recovery']),
    kind,
    schedule: current.schedule ?? BUILDER_RULE_DEFAULTS.schedule,
    metadata: { name: '', ...current.metadata, builder: { type: builder.type } },
    ...parts,
  };

  const result = await executeRuleOperations(
    generated,
    [...settings],
    esClient,
    savedObjectsClient,
    { isNew }
  );
  const warnings = [...(result.warnings ?? [])];

  const rootQuery = getRootEsqlQuery(parts.query);
  warnOnBackingIndices(
    warnings,
    rootQuery,
    'The rule query',
    current.query ? getRootEsqlQuery(current.query) : undefined
  );

  let queryColumns: EsqlColumn[] | undefined;
  if (esClient) {
    // The builder generated the breach segment too, so check the full breach query.
    queryColumns = await validateEsqlQuery(esClient, getBreachEsqlQuery(parts.query));
    await assertTimeFieldExists(esClient, rootQuery, parts.time_field);
  }

  assertRuleReadyToSave(result.data);

  return {
    data: result.data,
    params: checked.params,
    ...(queryColumns ? { queryColumns } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
};
