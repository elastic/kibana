/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { injectable } from 'inversify';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';

@injectable()
export class FocusedActionPolicyService {
  private readonly focusedActionPolicySubject$ = new BehaviorSubject<
    ActionPolicyResponse | undefined
  >(undefined);

  public readonly focusedActionPolicy$ = this.focusedActionPolicySubject$.asObservable();

  public setFocusedActionPolicy(policy: ActionPolicyResponse): void {
    this.focusedActionPolicySubject$.next(policy);
  }

  public clearFocusedActionPolicy(policyId?: string): void {
    const focusedPolicy = this.focusedActionPolicySubject$.getValue();

    if (policyId && focusedPolicy?.id !== policyId) {
      return;
    }

    this.focusedActionPolicySubject$.next(undefined);
  }

  public getFocusedActionPolicy(): ActionPolicyResponse | undefined {
    return this.focusedActionPolicySubject$.getValue();
  }
}
