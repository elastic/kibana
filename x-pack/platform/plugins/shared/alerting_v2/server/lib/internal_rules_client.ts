/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId, type SpaceId } from '@kbn/core-spaces-common';
import type { BulkByIdsParams, BulkResponse } from './rules_client';
import { toBulkError } from './rules_client/utils';
import type { RulesSavedObjectServiceContract } from './services/rules_saved_object_service/rules_saved_object_service';
import { savedObjectNamespacesToSpaceId } from './space_id_to_namespace';
import type { InternalRulesClientApi, RulesClientApi } from '../types';

/**
 * Builds the internal rules client. Rule ids are unique across spaces, so it finds
 * each rule's space and disables every space's rules through that space's client.
 */
export const createInternalRulesClient = ({
  rulesSavedObjectService,
  getRulesClientInSpace,
}: {
  /** Must search every namespace, i.e. be backed by an internal repository. */
  rulesSavedObjectService: Pick<RulesSavedObjectServiceContract, 'findByIds'>;
  getRulesClientInSpace: (spaceId: SpaceId) => Pick<RulesClientApi, 'bulkDisableRules'>;
}): InternalRulesClientApi => ({
  async bulkDisableRules({ ids }: BulkByIdsParams): Promise<BulkResponse> {
    const uniqueIds = [...new Set(ids)];
    const found = await rulesSavedObjectService.findByIds(uniqueIds);

    const idsBySpace = new Map<SpaceId, string[]>();
    for (const { id, namespaces } of found) {
      const spaceId = asSpaceId(savedObjectNamespacesToSpaceId(namespaces));
      idsBySpace.set(spaceId, [...(idsBySpace.get(spaceId) ?? []), id]);
    }

    let affectedCount = 0;
    const errors: BulkResponse['errors'] = [];
    for (const [spaceId, spaceRuleIds] of idsBySpace) {
      const response = await getRulesClientInSpace(spaceId).bulkDisableRules({
        ids: spaceRuleIds,
      });
      affectedCount += response.affected_count;
      errors.push(...response.errors);
    }

    const foundIds = new Set(found.map(({ id }) => id));
    for (const id of uniqueIds.filter((ruleId) => !foundIds.has(ruleId))) {
      errors.push(toBulkError(id, { statusCode: 404, message: `Rule ${id} not found` }));
    }

    return { affected_count: affectedCount, errors };
  },
});
