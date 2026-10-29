/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject } from 'inversify';
import { remotable } from '@kbn/core-remote-common';
import type {
  CreateCaseStepConfig,
  CreateCaseStepInput,
} from '../../common/workflows/steps/create_case';
import { CasesOperationsToken, type CaseAttribution, type CasesOperationsApi } from './tokens';

interface StepCall {
  with?: CreateCaseStepInput;
  config?: CreateCaseStepConfig;
}

interface StepContext {
  attribution?: CaseAttribution;
}

/** Executor-side step. Case creation stays on the coordinator. */
@remotable()
export class CreateCaseStep {
  constructor(@inject(CasesOperationsToken) private readonly cases: CasesOperationsApi) {}

  async run(scopeId: string, raw: unknown, context: StepContext): Promise<unknown> {
    const call = (raw ?? {}) as StepCall;
    if (!call.with) {
      throw new Error('cases.createCase requires step input');
    }
    return this.cases.create(scopeId, call.with, call.config ?? {}, context.attribution);
  }
}
