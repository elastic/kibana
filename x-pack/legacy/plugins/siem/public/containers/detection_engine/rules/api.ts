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
  DETECTION_ENGINE_RULES_STATUS_URL,
  DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL,
  DETECTION_ENGINE_TAGS_URL,
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
 * Fetches all rules from the Detection Engine API
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 * @param pagination desired pagination options (e.g. page/perPage)
 * @param signal to cancel request
 *
 */
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
}: FetchRulesProps): Promise<FetchRulesResponse> => {
  const filters = [
    ...(filterOptions.filter.length !== 0
      ? [`alert.attributes.name:%20${encodeURIComponent(filterOptions.filter)}`]
      : []),
    ...(filterOptions.showCustomRules
      ? ['alert.attributes.tags:%20%22__internal_immutable:false%22']
      : []),
    ...(filterOptions.showElasticRules
      ? ['alert.attributes.tags:%20%22__internal_immutable:true%22']
      : []),
    ...(filterOptions.tags?.map(t => `alert.attributes.tags:${encodeURIComponent(t)}`) ?? []),
  ];

  const queryParams = [
    `page=${pagination.page}`,
    `per_page=${pagination.perPage}`,
    `sort_field=${filterOptions.sortField}`,
    `sort_order=${filterOptions.sortOrder}`,
    ...(filters.length > 0 ? [`filter=${filters.join('%20AND%20')}`] : []),
  ];

  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}/_find?${queryParams.join('&')}`,
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

/**
 * Fetch a Rule by providing a Rule ID
 *
 * @param id Rule ID's (not rule_id)
 * @param signal to cancel request
 *
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
      method: 'PATCH',
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
 * @param rules to duplicate
 */
export const duplicateRules = async ({ rules }: DuplicateRulesProps): Promise<Rule[]> => {
  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
      body: JSON.stringify(
        rules.map(rule => ({
          ...rule,
          name: `${rule.name} [${i18n.DUPLICATE}]`,
          created_at: undefined,
          created_by: undefined,
          id: undefined,
          rule_id: undefined,
          updated_at: undefined,
          updated_by: undefined,
          enabled: rule.enabled,
          immutable: undefined,
          last_success_at: undefined,
          last_success_message: undefined,
          last_failure_at: undefined,
          last_failure_message: undefined,
          status: undefined,
          status_date: undefined,
        }))
      ),
    }
  );

  await throwIfNotOk(response);
  return response.json();
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
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getRuleStatusById = async ({
  id,
  signal,
}: {
  id: string;
  signal: AbortSignal;
}): Promise<Record<string, RuleStatus>> => {
  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_RULES_STATUS_URL}?ids=${encodeURIComponent(
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

/**
 * Fetch all unique Tags used by Rules
 *
 * @param signal to cancel request
 *
 */
export const fetchTags = async ({ signal }: { signal: AbortSignal }): Promise<string[]> => {
  const response = await fetch(`${chrome.getBasePath()}${DETECTION_ENGINE_TAGS_URL}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
    },
    signal,
  });

  await throwIfNotOk(response);
  return response.json();
};

/**
 * Get pre packaged rules Status
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getPrePackagedRulesStatus = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<{
  rules_custom_installed: number;
  rules_installed: number;
  rules_not_installed: number;
  rules_not_updated: number;
}> => {
  const response = await fetch(
    `${chrome.getBasePath()}${DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL}`,
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
