/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  AddRulesProps,
  DeleteRulesProps,
  DuplicateRulesProps,
  EnableRulesProps,
  FetchRulesProps,
  FetchRulesResponse,
  NewRule,
  Rule,
} from './types';
import { throwIfNotOk } from '../../../hooks/api/api';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';

/**
 * Add provided Rule
 *
 * @param rule to add
 * @param kbnVersion current Kibana Version to use for headers
 * @param signal to cancel request
 */
export const addRule = async ({ rule, kbnVersion, signal }: AddRulesProps): Promise<NewRule> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-version': kbnVersion,
      'kbn-xsrf': kbnVersion,
    },
    body: JSON.stringify(rule),
    signal,
  });

  await throwIfNotOk(response);
  return response.json();
};

/**
 * Fetches all rules or single specified rule from the Detection Engine API
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 * @param pagination desired pagination options (e.g. page/perPage)
 * @param id if specified, will return specific rule if exists
 * @param kbnVersion current Kibana Version to use for headers
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
  id,
  kbnVersion,
  signal,
}: FetchRulesProps): Promise<FetchRulesResponse> => {
  const queryParams = [
    `page=${pagination.page}`,
    `per_page=${pagination.perPage}`,
    `sort_field=${filterOptions.sortField}`,
    `sort_order=${filterOptions.sortOrder}`,
    ...(filterOptions.filter.length !== 0
      ? [`filter=alert.attributes.name:%20${encodeURIComponent(filterOptions.filter)}`]
      : []),
  ];

  const endpoint =
    id != null
      ? `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}?id="${id}"`
      : `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}/_find?${queryParams.join('&')}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    signal,
  });
  await throwIfNotOk(response);
  return id != null
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
 * @param ids array of Rule ID's (not rule_id) to enable/disable
 * @param enabled to enable or disable
 * @param kbnVersion current Kibana Version to use for headers
 */
export const enableRules = async ({
  ids,
  enabled,
  kbnVersion,
}: EnableRulesProps): Promise<Rule[]> => {
  const requests = ids.map(id =>
    fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
      body: JSON.stringify({ id, enabled }),
    })
  );

  const responses = await Promise.all(requests);
  await responses.map(response => throwIfNotOk(response));
  return Promise.all(
    responses.map<Promise<Rule>>(response => response.json())
  );
};

/**
 * Deletes provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to delete
 * @param kbnVersion current Kibana Version to use for headers
 */
export const deleteRules = async ({ ids, kbnVersion }: DeleteRulesProps): Promise<Rule[]> => {
  // TODO: Don't delete if immutable!
  const requests = ids.map(id =>
    fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}?id=${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
    })
  );

  const responses = await Promise.all(requests);
  await responses.map(response => throwIfNotOk(response));
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
    fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}`, {
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
  await responses.map(response => throwIfNotOk(response));
  return Promise.all(
    responses.map<Promise<Rule>>(response => response.json())
  );
};
