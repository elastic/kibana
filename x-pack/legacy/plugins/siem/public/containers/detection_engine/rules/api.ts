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
  FetchRuleProps,
  BasicFetchProps,
  ImportRulesProps,
  ExportRulesProps,
  RuleError,
  RuleStatus,
  ImportRulesResponse,
} from './types';
import { throwIfNotOk } from '../../../hooks/api/api';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_PREPACKAGED_URL,
  DETECTION_ENGINE_RULES_STATUS,
} from '../../../../common/constants';
import * as i18n from '../../../pages/detection_engine/rules/translations';

/**
 * Add provided Rule
 *
 * @param rule to add
 * @param signal to cancel request
 */
export const addRule = async ({ rule, signal }: AddRulesProps): Promise<NewRule> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}`, {
    method: rule.id != null ? 'PUT' : 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
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
 * Fetch a Rule by providing a Rule ID
 *
 * @param id Rule ID's (not rule_id)
 */
export const fetchRuleById = async ({ id, signal }: FetchRuleProps): Promise<Rule> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}?id=${id}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    signal,
  });
  await throwIfNotOk(response);
  const rule: Rule = await response.json();
  return rule;
};

/**
 * Enables/Disables provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to enable/disable
 * @param enabled to enable or disable
 *
 * @throws An error if response is not OK
 */
export const enableRules = async ({ ids, enabled }: EnableRulesProps): Promise<Rule[]> => {
  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
    {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
      body: JSON.stringify(ids.map(id => ({ id, enabled }))),
    }
  );

  await throwIfNotOk(response);
  return response.json();
};

/**
 * Deletes provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to delete
 *
 * @throws An error if response is not OK
 */
export const deleteRules = async ({ ids }: DeleteRulesProps): Promise<Array<Rule | RuleError>> => {
  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
      body: JSON.stringify(ids.map(id => ({ id }))),
    }
  );

  await throwIfNotOk(response);
  return response.json();
};

/**
 * Duplicates provided Rules
 *
 * @param rule to duplicate
 */
export const duplicateRules = async ({ rules }: DuplicateRulesProps): Promise<Rule[]> => {
  const requests = rules.map(rule =>
    fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
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
    })
  );

  const responses = await Promise.all(requests);
  await responses.map(response => throwIfNotOk(response));
  return Promise.all(
    responses.map<Promise<Rule>>(response => response.json())
  );
};

/**
 * Create Prepackaged Rules
 *
 * @param signal AbortSignal for cancelling request
 */
export const createPrepackagedRules = async ({ signal }: BasicFetchProps): Promise<boolean> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_PREPACKAGED_URL}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    signal,
  });
  await throwIfNotOk(response);
  return true;
};

/**
 * Imports rules in the same format as exported via the _export API
 *
 * @param fileToImport File to upload containing rules to import
 * @param overwrite whether or not to overwrite rules with the same ruleId
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const importRules = async ({
  fileToImport,
  overwrite = false,
  signal,
}: ImportRulesProps): Promise<ImportRulesResponse> => {
  const formData = new FormData();
  formData.append('file', fileToImport);

  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}/_import?overwrite=${overwrite}`,
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'kbn-xsrf': 'true',
      },
      body: formData,
      signal,
    }
  );

  await throwIfNotOk(response);
  return response.json();
};

/**
 * Export rules from the server as a file download
 *
 * @param excludeExportDetails whether or not to exclude additional details at bottom of exported file (defaults to false)
 * @param filename of exported rules. Be sure to include `.ndjson` extension! (defaults to localized `rules_export.ndjson`)
 * @param ruleIds array of rule_id's (not id!) to export (empty array exports _all_ rules)
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const exportRules = async ({
  excludeExportDetails = false,
  filename = `${i18n.EXPORT_FILENAME}.ndjson`,
  ruleIds = [],
  signal,
}: ExportRulesProps): Promise<Blob> => {
  const body =
    ruleIds.length > 0
      ? JSON.stringify({ objects: ruleIds.map(rule => ({ rule_id: rule })) })
      : undefined;

  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}/_export?exclude_export_details=${excludeExportDetails}&file_name=${encodeURIComponent(
      filename
    )}`,
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
      body,
      signal,
    }
  );

  await throwIfNotOk(response);
  return response.blob();
};

/**
 * Get Rule Status provided Rule ID
 *
 * @param id string of Rule ID's (not rule_id)
 *
 * @throws An error if response is not OK
 */
export const getRuleStatusById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<Record<string, RuleStatus[]>> => {
  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_STATUS}?ids=${encodeURIComponent(
      JSON.stringify([id])
    )}`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
      signal,
    }
  );

  await throwIfNotOk(response);
  return response.json();
};
