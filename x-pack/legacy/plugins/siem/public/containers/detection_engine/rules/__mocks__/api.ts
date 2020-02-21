/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AddRulesProps,
  NewRule,
  PrePackagedRulesStatusResponse,
  BasicFetchProps,
  RuleStatusResponse,
  Rule,
  FetchRuleProps,
  FetchRulesResponse,
  FetchRulesProps,
} from '../types';
import { ruleMock, savedRuleMock, rulesMock } from '../mock';

export const addRule = async ({ rule, signal }: AddRulesProps): Promise<NewRule> =>
  Promise.resolve(ruleMock);

export const getPrePackagedRulesStatus = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<PrePackagedRulesStatusResponse> =>
  Promise.resolve({
    rules_custom_installed: 33,
    rules_installed: 12,
    rules_not_installed: 0,
    rules_not_updated: 0,
  });

export const createPrepackagedRules = async ({ signal }: BasicFetchProps): Promise<boolean> =>
  Promise.resolve(true);

export const getRuleStatusById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<RuleStatusResponse> =>
  Promise.resolve({
    myOwnRuleID: {
      current_status: {
        alert_id: 'alertId',
        status_date: 'mm/dd/yyyyTHH:MM:sssz',
        status: 'succeeded',
        last_failure_at: null,
        last_success_at: 'mm/dd/yyyyTHH:MM:sssz',
        last_failure_message: null,
        last_success_message: 'it is a success',
      },
      failures: [],
    },
  });

export const fetchRuleById = async ({ id, signal }: FetchRuleProps): Promise<Rule> =>
  Promise.resolve(savedRuleMock);

export const fetchRules = async ({
  filterOptions = {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
    showCustomRules: false,
    showElasticRules: false,
    tags: [],
  },
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  signal,
}: FetchRulesProps): Promise<FetchRulesResponse> => Promise.resolve(rulesMock);

export const fetchTags = async ({ signal }: { signal: AbortSignal }): Promise<string[]> =>
  Promise.resolve(['elastic', 'love', 'quality', 'code']);
