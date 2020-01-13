/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import {
  AddRulesProps,
  DeleteRulesProps,
  DuplicateRulesProps,
  EnableRulesProps,
  FetchRulesProps,
  FetchRulesResponse,
  NewRule,
  Rule,
  FetchRuleProps,
} from './types';
import { throwIfNotOk } from '../../../hooks/api/api';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';

/**
 * Add provided Rule
 *
 * @param rule to add
 * @param signal to cancel request
 */
export const addRule = async ({ rule, signal }: AddRulesProps): Promise<NewRule> => {
  const response = await npStart.core.http.fetch<NewRule>(DETECTION_ENGINE_RULES_URL, {
    method: rule.id != null ? 'PUT' : 'POST',
    credentials: 'same-origin',
    body: JSON.stringify(rule),
    asResponse: true,
    signal,
  });

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Fetches all rules or single specified rule from the Detection Engine API
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 * @param pagination desired pagination options (e.g. page/perPage)
 * @param signal to cancel request
 */
export const fetchRules = async ({
  filterOptions = {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
  },
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  signal,
}: FetchRulesProps): Promise<FetchRulesResponse> => {
  const query = {
    page: pagination.page,
    per_page: pagination.perPage,
    sort_field: filterOptions.sortField,
    sort_order: filterOptions.sortOrder,
    ...(filterOptions.filter ? { filter: `alert.attributes.name: ${filterOptions.filter}` } : {}),
  };

  const response = await npStart.core.http.fetch<FetchRulesResponse>(
    `${DETECTION_ENGINE_RULES_URL}/_find`,
    {
      method: 'GET',
      query,
      credentials: 'same-origin',
      signal,
      asResponse: true,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Fetch a Rule by providing a Rule ID
 *
 * @param id Rule ID's (not rule_id)
 */
export const fetchRuleById = async ({ id, signal }: FetchRuleProps): Promise<Rule> => {
  const response = await npStart.core.http.fetch<Rule>(DETECTION_ENGINE_RULES_URL, {
    method: 'GET',
    query: { id },
    credentials: 'same-origin',
    asResponse: true,
    signal,
  });

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Enables/Disables provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to enable/disable
 * @param enabled to enable or disable
 */
export const enableRules = async ({ ids, enabled }: EnableRulesProps): Promise<Rule[]> => {
  const responses = await Promise.all(
    ids.map(id =>
      npStart.core.http.fetch<Rule>(DETECTION_ENGINE_RULES_URL, {
        method: 'PUT',
        credentials: 'same-origin',
        body: JSON.stringify({ id, enabled }),
        asResponse: true,
      })
    )
  );

  await Promise.all(responses.map(response => throwIfNotOk(response.response)));
  return responses.map(response => response.body!);
};

/**
 * Deletes provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to delete
 */
export const deleteRules = async ({ ids }: DeleteRulesProps): Promise<Rule[]> => {
  // TODO: Don't delete if immutable!
  const responses = await Promise.all(
    ids.map(id =>
      npStart.core.http.fetch<Rule>(DETECTION_ENGINE_RULES_URL, {
        method: 'DELETE',
        query: { id },
        credentials: 'same-origin',
        asResponse: true,
      })
    )
  );

  await Promise.all(responses.map(response => throwIfNotOk(response.response)));
  return responses.map(response => response.body!);
};

/**
 * Duplicates provided Rules
 *
 * @param rule to duplicate
 */
export const duplicateRules = async ({ rules }: DuplicateRulesProps): Promise<Rule[]> => {
  const responses = await Promise.all(
    rules.map(rule =>
      npStart.core.http.fetch<Rule>(DETECTION_ENGINE_RULES_URL, {
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({
          ...rule,
          name: `${rule.name} [Duplicate]`,
          created_at: undefined,
          created_by: undefined,
          id: undefined,
          rule_id: undefined,
          updated_at: undefined,
          updated_by: undefined,
          enabled: rule.enabled,
          immutable: false,
        }),
        asResponse: true,
      })
    )
  );

  await Promise.all(responses.map(response => throwIfNotOk(response.response)));
  return responses.map(response => response.body!);
};
