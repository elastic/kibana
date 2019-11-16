/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  DeleteRulesProps,
  DuplicateRuleProps,
  EnableRulesProps,
  ExportRulesProps,
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
  ruleId = '_find',
  kbnVersion,
}: FetchRulesProps): Promise<FetchRulesResponse> => {
  const response = await fetch(
    `${chrome.getBasePath()}/api/siem/signals/${ruleId}?page=${paginationOptions.page}&per_page=${
      paginationOptions.perPage
    }&sort_field=${paginationOptions.sortField}`,
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
  return ruleId !== '_find'
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
    fetch(`${chrome.getBasePath()}/api/siem/signals`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
      body: JSON.stringify({ id: ruleId, enabled }),
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
  const requests = ruleIds.map(ruleId =>
    fetch(`${chrome.getBasePath()}/api/siem/signals/${encodeURIComponent(ruleId)}`, {
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
 * Duplicates provided Rule
 *
 * @param rule to duplicate
 * @param kbnVersion current Kibana Version to use for headers
 */
export const duplicateRule = async ({ rule, kbnVersion }: DuplicateRuleProps): Promise<Rule> => {
  const newRuleId = `${rule.alertTypeParams.id} (1)`;
  // TODO: Check if exists before create
  // const existingRule = await fetchRules({ ruleId: encodeURIComponent(newRuleId), kbnVersion });
  // console.log('New Rule ID exists?', existingRule.data && existingRule.data.length !== 0);

  const response = await fetch(`${chrome.getBasePath()}/api/siem/signals`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-version': kbnVersion,
      'kbn-xsrf': kbnVersion,
    },
    body: JSON.stringify(
      (({ description, index, severity, type, from, to, query, language, references }) => ({
        id: newRuleId,
        description,
        index,
        interval: rule.interval,
        name: rule.name,
        severity,
        type,
        from,
        to,
        query,
        language,
        references,
      }))(rule.alertTypeParams)
    ),
  });

  // ["name", "filter", "filters", "savedId", "maxSignals"]}
  await throwIfNotOk(response);
  return response.json();
};

/**
 * Export Rule Saved Object(s)
 *
 * @param ruleIds array of rule ID's to enable/disable
 * @param kbnVersion current Kibana Version to use for headers
 */
export const exportRules = async ({ ruleIds, kbnVersion }: ExportRulesProps): Promise<Rule[]> => {
  const requests = ruleIds.map(ruleId =>
    fetch(`${chrome.getBasePath()}/api/saved_objects/_export`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
      body: JSON.stringify({
        objects: [{ id: ruleId, type: 'alert' }],
        includeReferencesDeep: false,
      }),
    })
  );

  const responses = await Promise.all(requests);
  // await throwIfNotOk(responses);
  return Promise.all(
    responses.map<Promise<Rule>>(response => response.json())
  );
};
