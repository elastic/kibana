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
  BasicFetchProps,
  ImportRulesProps,
  ExportRulesProps,
  RuleError,
  RuleStatusResponse,
  ImportRulesResponse,
  PrePackagedRulesStatusResponse,
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
  const response = await npStart.core.http.fetch<NewRule>(DETECTION_ENGINE_RULES_URL, {
    method: rule.id != null ? 'PUT' : 'POST',
    body: JSON.stringify(rule),
    asResponse: true,
    signal,
  });

  await throwIfNotOk(response.response);
  return response.body!;
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
    ...(filterOptions.filter.length ? [`alert.attributes.name: ${filterOptions.filter}`] : []),
    ...(filterOptions.showCustomRules
      ? [`alert.attributes.tags: "__internal_immutable:false"`]
      : []),
    ...(filterOptions.showElasticRules
      ? [`alert.attributes.tags: "__internal_immutable:true"`]
      : []),
    ...(filterOptions.tags?.map(t => `alert.attributes.tags: ${t}`) ?? []),
  ];

  const query = {
    page: pagination.page,
    per_page: pagination.perPage,
    sort_field: filterOptions.sortField,
    sort_order: filterOptions.sortOrder,
    ...(filters.length ? { filter: filters.join(' AND ') } : {}),
  };

  const response = await npStart.core.http.fetch<FetchRulesResponse>(
    `${DETECTION_ENGINE_RULES_URL}/_find`,
    {
      method: 'GET',
      query,
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
 * @param signal to cancel request
 *
 */
export const fetchRuleById = async ({ id, signal }: FetchRuleProps): Promise<Rule> => {
  const response = await npStart.core.http.fetch<Rule>(DETECTION_ENGINE_RULES_URL, {
    method: 'GET',
    query: { id },
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
 *
 * @throws An error if response is not OK
 */
export const enableRules = async ({ ids, enabled }: EnableRulesProps): Promise<Rule[]> => {
  const response = await npStart.core.http.fetch<Rule[]>(
    `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
    {
      method: 'PUT',
      body: JSON.stringify(ids.map(id => ({ id, enabled }))),
      asResponse: true,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Deletes provided Rule ID's
 *
 * @param ids array of Rule ID's (not rule_id) to delete
 *
 * @throws An error if response is not OK
 */
export const deleteRules = async ({ ids }: DeleteRulesProps): Promise<Array<Rule | RuleError>> => {
  const response = await npStart.core.http.fetch<Rule[]>(
    `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    {
      method: 'PUT',
      body: JSON.stringify(ids.map(id => ({ id }))),
      asResponse: true,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Duplicates provided Rules
 *
 * @param rules to duplicate
 */
export const duplicateRules = async ({ rules }: DuplicateRulesProps): Promise<Rule[]> => {
  const response = await npStart.core.http.fetch<Rule[]>(
    `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
    {
      method: 'POST',
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
      asResponse: true,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Create Prepackaged Rules
 *
 * @param signal AbortSignal for cancelling request
 */
export const createPrepackagedRules = async ({ signal }: BasicFetchProps): Promise<boolean> => {
  const response = await npStart.core.http.fetch<unknown>(DETECTION_ENGINE_PREPACKAGED_URL, {
    method: 'PUT',
    signal,
    asResponse: true,
  });

  await throwIfNotOk(response.response);
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

  const response = await npStart.core.http.fetch<ImportRulesResponse>(
    `${DETECTION_ENGINE_RULES_URL}/_import`,
    {
      method: 'POST',
      headers: { 'Content-Type': undefined },
      query: { overwrite },
      body: formData,
      asResponse: true,
      signal,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
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

  const response = await npStart.core.http.fetch<Blob>(`${DETECTION_ENGINE_RULES_URL}/_export`, {
    method: 'POST',
    body,
    query: {
      exclude_export_details: excludeExportDetails,
      file_name: filename,
    },
    signal,
    asResponse: true,
  });

  await throwIfNotOk(response.response);
  return response.body!;
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
}): Promise<RuleStatusResponse> => {
  const response = await npStart.core.http.fetch<RuleStatusResponse>(
    DETECTION_ENGINE_RULES_STATUS_URL,
    {
      method: 'GET',
      query: { ids: JSON.stringify([id]) },
      signal,
      asResponse: true,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};

/**
 * Fetch all unique Tags used by Rules
 *
 * @param signal to cancel request
 *
 */
export const fetchTags = async ({ signal }: { signal: AbortSignal }): Promise<string[]> => {
  const response = await npStart.core.http.fetch<string[]>(DETECTION_ENGINE_TAGS_URL, {
    method: 'GET',
    signal,
    asResponse: true,
  });

  await throwIfNotOk(response.response);
  return response.body!;
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
}): Promise<PrePackagedRulesStatusResponse> => {
  const response = await npStart.core.http.fetch<PrePackagedRulesStatusResponse>(
    DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL,
    {
      method: 'GET',
      signal,
      asResponse: true,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};
