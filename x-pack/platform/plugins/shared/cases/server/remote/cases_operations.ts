/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { remotable } from '@kbn/core-remote-common';
import type { ScopeLookup } from '@kbn/core-remote-server';
import { ActionSourceTypes, toActionSource } from '../../common/types/domain';
import type { GetCasesClientFn } from '../client/types';
import { pushCase } from '../workflows/steps/utils';
import { createCaseWithClient } from '../workflows/steps/create_case';
import type { CaseAttribution, CasesOperationsApi } from './tokens';
import type {
  CreateCaseStepConfig,
  CreateCaseStepInput,
} from '../../common/workflows/steps/create_case';

/**
 * Coordinator-side Cases capability. The worker names the operation; this class binds the
 * existing authenticated client and preserves workflow action-source attribution.
 */
@remotable()
export class CasesOperations implements CasesOperationsApi {
  constructor(
    private readonly scopes: ScopeLookup,
    private readonly getCasesClient: GetCasesClientFn
  ) {}

  async create(
    scopeId: string,
    input: CreateCaseStepInput,
    config: CreateCaseStepConfig,
    attribution?: CaseAttribution
  ): Promise<{ output: { case: Awaited<ReturnType<typeof createCaseWithClient>> } }> {
    const request = this.scopes.get<KibanaRequest>(scopeId);
    const actionSource =
      attribution?.type === ActionSourceTypes.workflow
        ? toActionSource({
            type: ActionSourceTypes.workflow,
            id: attribution.id,
            name: attribution.name,
            runId: attribution.runId,
          })
        : undefined;
    const casesClient = await this.getCasesClient(
      request,
      actionSource ? { actionSource } : undefined
    );
    const theCase = await createCaseWithClient(casesClient, input, config);
    if (config['push-case']) {
      await pushCase(casesClient, theCase);
    }
    return { output: { case: theCase } };
  }
}
