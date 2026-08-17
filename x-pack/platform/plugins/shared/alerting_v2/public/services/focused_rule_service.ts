/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { injectable } from 'inversify';
import type { RuleApiResponse } from './rules_api';

@injectable()
export class FocusedRuleService {
  private readonly focusedRuleSubject$ = new BehaviorSubject<RuleApiResponse | undefined>(
    undefined
  );

  public readonly focusedRule$ = this.focusedRuleSubject$.asObservable();

  public setFocusedRule(rule: RuleApiResponse): void {
    this.focusedRuleSubject$.next(rule);
  }

  public clearFocusedRule(ruleId?: string): void {
    const focusedRule = this.focusedRuleSubject$.getValue();

    if (ruleId && focusedRule?.id !== ruleId) {
      return;
    }

    this.focusedRuleSubject$.next(undefined);
  }

  public getFocusedRule(): RuleApiResponse | undefined {
    return this.focusedRuleSubject$.getValue();
  }
}
