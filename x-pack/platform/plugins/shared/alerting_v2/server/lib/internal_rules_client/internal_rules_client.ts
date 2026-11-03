/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_BULK_ITEMS, entityIdSchema } from '@kbn/alerting-v2-schemas';
import { brandSpaceId, type SpaceId } from '@kbn/core-spaces-common';
import { inject, injectable } from 'inversify';
import { partition } from 'lodash';
import type { InternalRulesClientApi } from '../../types';
import type { BulkByIdsParams, BulkResponse } from '../rules_client';
import { toBulkError } from '../rules_client/utils';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectServiceInternalToken } from '../services/rules_saved_object_service/tokens';
import { savedObjectNamespacesToSpaceId } from '../space_id_to_namespace';
import { InternalRulesClientProvider } from './internal_rules_client_provider';

/**
 * Rules client for system work with no user request. It only disables rules.
 *
 * Rule ids are unique across spaces, so it finds each rule's space and disables every
 * space's rules through that space's regular {@link RulesClient}, run as the internal user.
 * Each rule is therefore read twice: once to find its space, once by the space's client.
 */
@injectable()
export class InternalRulesClient implements InternalRulesClientApi {
  constructor(
    @inject(InternalRulesClientProvider) private readonly provider: InternalRulesClientProvider,
    /** Must search every namespace, i.e. be backed by an internal repository. */
    @inject(RulesSavedObjectServiceInternalToken)
    private readonly rulesSavedObjectService: RulesSavedObjectServiceContract
  ) {}

  public async bulkDisableRules({ ids }: BulkByIdsParams): Promise<BulkResponse> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > MAX_BULK_ITEMS) {
      throw Boom.badRequest(
        `Received ${uniqueIds.length} rule ids, exceeding the maximum of ${MAX_BULK_ITEMS} per request. Split the operation into multiple requests.`
      );
    }

    // The ids are interpolated into the lookup query, so only look up ids the HTTP API accepts.
    const [validIds, invalidIds] = partition(
      uniqueIds,
      (id) => entityIdSchema.safeParse(id).success
    );

    // Any non-empty list works: the lookup only needs `id` and `namespaces`, which are always
    // returned, and an empty list would return every attribute.
    const found = await this.rulesSavedObjectService.findByIds(validIds, { fields: ['enabled'] });

    const idsBySpace = new Map<SpaceId, string[]>();
    for (const { id, namespaces } of found) {
      const spaceId = brandSpaceId(savedObjectNamespacesToSpaceId(namespaces));
      const spaceRuleIds = idsBySpace.get(spaceId) ?? [];
      spaceRuleIds.push(id);
      idsBySpace.set(spaceId, spaceRuleIds);
    }

    let affectedCount = 0;
    const errors: BulkResponse['errors'] = [];
    for (const [spaceId, spaceRuleIds] of idsBySpace) {
      try {
        const response = await this.provider.withRulesClientInSpace(spaceId, (client) =>
          client.bulkDisableRules({ ids: spaceRuleIds })
        );
        affectedCount += response.affected_count;
        errors.push(...response.errors);
      } catch (error) {
        // One failing space must not stop the others from being disabled.
        const failure = {
          statusCode: Boom.isBoom(error) ? error.output.statusCode : 500,
          message: error instanceof Error ? error.message : String(error),
        };
        errors.push(...spaceRuleIds.map((id) => toBulkError(id, failure)));
      }
    }

    const foundIds = new Set(found.map(({ id }) => id));
    for (const id of validIds.filter((ruleId) => !foundIds.has(ruleId))) {
      errors.push(toBulkError(id, { statusCode: 404, message: `Rule ${id} not found` }));
    }
    for (const id of invalidIds) {
      errors.push(
        toBulkError(id, { statusCode: 400, message: `Rule id "${id}" is not a valid rule id` })
      );
    }

    return { affected_count: affectedCount, errors };
  }
}
