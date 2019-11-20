/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  DeleteRulesProps,
  DuplicateRulesProps,
  EnableRulesProps,
  FetchRulesProps,
  FetchRulesResponse,
  Rule,
} from './types';
import { throwIfNotOk } from '../../../hooks/api/api';

/**
 * Fetches all rules or single specified rule from the Detection Engine API
 *
 * @param paginationOptions
 * @param ruleId specified, will return specific rule if exists
 * @param kbnVersion current Kibana Version to use for headers
 */
export const fetchRules = async ({
  paginationOptions = {
    page: 1,
    perPage: 20,
    sortField: 'name',
  },
  ruleId,
  kbnVersion,
}: FetchRulesProps): Promise<FetchRulesResponse> => {
  const rulesParam = ruleId != null ? `?rule_id="${ruleId}&"` : '/_find?';
  const response = await fetch(
    `${chrome.getBasePath()}/api/detection_engine/rules${rulesParam}page=${
      paginationOptions.page
    }&per_page=${paginationOptions.perPage}&sort_field=${paginationOptions.sortField}`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
    }
  );
  await throwIfNotOk(response);
  return ruleId != null
    ? {
        page: 0,
        perPage: 1,
        total: 1,
        data: response.json(),
      }
    : response.json();
};

/**
 * Enables/Disables provided Rule ID's
 *
 * @param ruleIds array of rule ID's to enable/disable
 * @param enabled to enable or disable
 * @param kbnVersion current Kibana Version to use for headers
 */
export const enableRules = async ({
  ruleIds,
  enabled,
  kbnVersion,
}: EnableRulesProps): Promise<Rule[]> => {
  const requests = ruleIds.map(ruleId =>
    fetch(`${chrome.getBasePath()}/api/detection_engine/rules`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
      body: JSON.stringify({ rule_id: ruleId, enabled }),
    })
  );

  const responses = await Promise.all(requests);
  // await throwIfNotOk(responses);
  return Promise.all(
    responses.map<Promise<Rule>>(response => response.json())
  );
};

/**
 * Deletes provided Rule ID's
 *
 * @param ruleIds array of rule ID's to delete
 * @param kbnVersion current Kibana Version to use for headers
 */
export const deleteRules = async ({ ruleIds, kbnVersion }: DeleteRulesProps): Promise<Rule[]> => {
  // TODO: Don't delete immutable!
  const requests = ruleIds.map(ruleId =>
    fetch(`${chrome.getBasePath()}/api/detection_engine/rules?rule_id=${ruleId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
    })
  );
  // await throwIfNotOk(response);
  const responses = await Promise.all(requests);
  return Promise.all(
    responses.map<Promise<Rule>>(response => response.json())
  );
};

/**
 * Duplicates provided Rules
 *
 * @param rule to duplicate
 * @param kbnVersion current Kibana Version to use for headers
 */
export const duplicateRules = async ({
  rules,
  kbnVersion,
}: DuplicateRulesProps): Promise<Rule[]> => {
  const requests = rules.map(rule =>
    fetch(`${chrome.getBasePath()}/api/detection_engine/rules`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
      body: JSON.stringify({
        ...rule,
        name: `${rule.name} [Duplicate]`,
        created_by: undefined,
        id: undefined,
        rule_id: undefined,
        updated_by: undefined,
        enabled: rule.enabled,
      }),
    })
  );

  const responses = await Promise.all(requests);
  // await throwIfNotOk(responses);
  return Promise.all(
    responses.map<Promise<Rule>>(response => response.json())
  );
};
