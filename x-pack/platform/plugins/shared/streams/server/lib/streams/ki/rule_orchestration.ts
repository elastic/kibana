/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { QueryLink } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema/src/models/streams';
import pLimit from 'p-limit';
import type { EsqlRuleParams } from '../../sig_events/rules/esql/types';

const RULE_INSTALL_CONCURRENCY = 10;

export function toCreateRuleParams(queryLink: QueryLink, definition: Streams.all.Definition) {
  const { rule_id: ruleId, query } = queryLink;

  return {
    data: {
      name: query.title,
      consumer: 'streams',
      alertTypeId: 'streams.rules.esql',
      actions: [],
      params: {
        timestampField: '@timestamp',
        query: query.esql.query,
      },
      enabled: true,
      tags: ['streams', definition.name],
      schedule: {
        interval: '1m',
      },
    },
    options: {
      id: ruleId,
    },
  };
}

export function toUpdateRuleParams(queryLink: QueryLink, definition: Streams.all.Definition) {
  const { rule_id: ruleId, query } = queryLink;

  return {
    id: ruleId,
    data: {
      name: query.title,
      actions: [],
      params: {
        timestampField: '@timestamp',
        query: query.esql.query,
      },
      tags: ['streams', definition.name],
      schedule: {
        interval: '1m',
      },
    },
  };
}

/**
 * Install (or update on 409 conflict) a set of backing rules. The 409 path
 * handles the case where a rule with the deterministic id already exists in
 * the rules SO index — we update in place rather than fail.
 */
export async function installQueries(
  rulesClient: RulesClient,
  queriesToCreate: QueryLink[],
  queriesToUpdate: QueryLink[],
  definition: Streams.all.Definition
) {
  const limiter = pLimit(RULE_INSTALL_CONCURRENCY);

  await Promise.all([
    ...queriesToCreate.map((queryLink) =>
      limiter(() =>
        rulesClient
          .create<EsqlRuleParams>(toCreateRuleParams(queryLink, definition))
          .catch((error) => {
            if (isBoom(error) && error.output.statusCode === 409) {
              return rulesClient.update<EsqlRuleParams>(toUpdateRuleParams(queryLink, definition));
            }
            throw error;
          })
      )
    ),
    ...queriesToUpdate.map((queryLink) =>
      limiter(() =>
        rulesClient
          .update<EsqlRuleParams>(toUpdateRuleParams(queryLink, definition))
          .catch((error) => {
            if (isBoom(error) && error.output.statusCode === 404) {
              return rulesClient.create<EsqlRuleParams>(toCreateRuleParams(queryLink, definition));
            }
            throw error;
          })
      )
    ),
  ]);
}

/**
 * Bulk-uninstall the backing rules for a set of query links. 400 errors from
 * `bulkDeleteRules` (typically: rule already gone) are logged and swallowed
 * — the storage tombstone will run regardless.
 */
export async function uninstallQueries(
  rulesClient: RulesClient,
  logger: Logger,
  queries: QueryLink[]
): Promise<void> {
  if (queries.length === 0) {
    return;
  }

  const ruleIds = queries.map((q) => q.rule_id).filter(Boolean);
  if (ruleIds.length === 0) {
    return;
  }

  await rulesClient
    .bulkDeleteRules({ ids: ruleIds, ignoreInternalRuleTypes: false })
    .catch((error) => {
      if (isBoom(error) && error.output.statusCode === 400) {
        logger.warn(
          `bulkDeleteRules returned 400 for ${ruleIds.length} rule(s) — some rules may not have existed: ${error.message}`
        );
        return;
      }
      throw error;
    });
}
