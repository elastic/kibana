/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type {
  CreateCaseStepConfig,
  CreateCaseStepInput,
  CreateCaseStepOutput,
} from '../../common/workflows/steps/create_case';

/** Same stable id as the Workflows Extensions contribution kind. */
export const WorkflowStepKind = createToken<unknown>('workflows.step');

export interface CaseAttribution {
  readonly type: string;
  readonly id: string;
  readonly name: string;
  readonly runId: string;
}

export interface CasesOperationsApi {
  create(
    scopeId: string,
    input: CreateCaseStepInput,
    config: CreateCaseStepConfig,
    attribution?: CaseAttribution
  ): Promise<{ output: { case: CreateCaseStepOutput['case'] } }>;
}

export const CasesOperationsToken = createToken<CasesOperationsApi>('cases.operations');
