/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { convertRuleIdsToKueryNode } from '../../../../lib/convert_rule_ids_to_kuery_node';
import { findRulesSo } from '../../../../data/rule/methods/find_rules_so';
import type { RulesClientContext } from '../../../../rules_client';
import type { GetRuleTypesByQueryParams, GetRuleTypesByQueryResponse } from './types';
import { buildKueryNodeFilter } from '../../../../rules_client/common/build_kuery_node_filter';

export async function getRuleTypesByQuery(
  context: RulesClientContext,
  params: GetRuleTypesByQueryParams
): Promise<GetRuleTypesByQueryResponse> {
  try {
    const { unsecuredSavedObjectsClient, ruleTypeRegistry } = context;
    const { filter, ids } = params;

    const totalRuleTypes = ruleTypeRegistry.getAllTypes().length;

    if (ids && filter) {
      throw Boom.badRequest(
        "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
      );
    }

    const qNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : buildKueryNodeFilter(filter);

    const { aggregations } = await findRulesSo<{
      ruleTypeIds: {
        buckets: Array<{
          key: string;
          doc_count: number;
        }>;
      };
    }>({
      savedObjectsClient: unsecuredSavedObjectsClient,
      savedObjectsFindOptions: {
        filter: qNodeFilter,
        page: 1,
        perPage: 0,
        aggs: {
          ruleTypeIds: {
            terms: { field: 'alert.attributes.alertTypeId', size: totalRuleTypes },
          },
        },
      },
    });

    const ruleTypeIds = new Set(
      aggregations?.ruleTypeIds.buckets?.map((bucket) => bucket.key) ?? []
    );

    return { ruleTypes: Array.from(ruleTypeIds) };
  } catch (err) {
    const errorMessage = `Failed to find rule types by query`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
