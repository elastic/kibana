/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { FilteringRule, FilteringRules } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface PutConnectorFilteringDraftArgs {
  advancedSnippet: string;
  connectorId: string;
  filteringRules: FilteringRule[];
  http?: HttpSetup;
}

export type PutConnectorFilteringDraftResponse = FilteringRules;

export const putConnectorFilteringDraft = async ({
  advancedSnippet,
  connectorId,
  filteringRules,
  http,
}: PutConnectorFilteringDraftArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/filtering/draft`;

  return await http?.put(route, {
    body: JSON.stringify({
      advanced_snippet: advancedSnippet,
      filtering_rules: filteringRules,
    }),
  });
};

export const ConnectorFilteringDraftApiLogic = createApiLogic(
  ['content', 'connector_filtering_draft_api_logic'],
  putConnectorFilteringDraft,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.contentConnectors.content.index.connector.syncRules.successToastDraft.title',
        { defaultMessage: 'Draft rules saved' }
      ),
  }
);
