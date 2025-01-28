/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ServiceName, KibanaSavedObjectType } from '../../types';
import { ElasticsearchAssetType, KibanaAssetType } from '../../types';

// only allow Kibana assets for the kibana key, ES assets for elasticsearch, etc
type ServiceNameToAssetTypes = Record<Extract<ServiceName, 'kibana'>, KibanaAssetType[]> &
  Record<Extract<ServiceName, 'elasticsearch'>, ElasticsearchAssetType[]>;

export const DisplayedAssetsFromPackageInfo: ServiceNameToAssetTypes = {
  kibana: Object.values(KibanaAssetType),
  elasticsearch: Object.values(ElasticsearchAssetType),
};

export const AssetTitleMap: Record<
  KibanaSavedObjectType | KibanaAssetType | ElasticsearchAssetType | 'view',
  string
> = {
  // Kibana
  // Duplication is because some assets are listed from package paths (snake cased)
  // and some are from saved objects (kebab cased)
  dashboard: i18n.translate('xpack.fleet.epm.assetTitles.dashboards', {
    defaultMessage: 'Dashboards',
  }),
  lens: i18n.translate('xpack.fleet.epm.assetTitles.lens', {
    defaultMessage: 'Lens',
  }),
  visualization: i18n.translate('xpack.fleet.epm.assetTitles.visualizations', {
    defaultMessage: 'Visualizations',
  }),
  search: i18n.translate('xpack.fleet.epm.assetTitles.savedSearches', {
    defaultMessage: 'Discover sessions',
  }),
  'index-pattern': i18n.translate('xpack.fleet.epm.assetTitles.indexPatterns', {
    defaultMessage: 'Data views',
  }),
  index_pattern: i18n.translate('xpack.fleet.epm.assetTitles.indexPatterns', {
    defaultMessage: 'Data views',
  }),
  map: i18n.translate('xpack.fleet.epm.assetTitles.maps', {
    defaultMessage: 'Maps',
  }),
  'security-ai-prompt': i18n.translate('xpack.fleet.epm.assetTitles.securityAIPrompt', {
    defaultMessage: 'Security AI prompt',
  }),
  security_ai_prompt: i18n.translate('xpack.fleet.epm.assetTitles.securityAIPrompt', {
    defaultMessage: 'Security AI prompt',
  }),
  'security-rule': i18n.translate('xpack.fleet.epm.assetTitles.securityRules', {
    defaultMessage: 'Security rules',
  }),
  security_rule: i18n.translate('xpack.fleet.epm.assetTitles.securityRules', {
    defaultMessage: 'Security rules',
  }),
  'csp-rule-template': i18n.translate(
    'xpack.fleet.epm.assetTitles.cloudSecurityPostureRuleTemplate',
    {
      defaultMessage: 'Benchmark rules',
    }
  ),
  csp_rule_template: i18n.translate(
    'xpack.fleet.epm.assetTitles.cloudSecurityPostureRuleTemplate',
    {
      defaultMessage: 'Benchmark rules',
    }
  ),
  'ml-module': i18n.translate('xpack.fleet.epm.assetTitles.mlModules', {
    defaultMessage: 'Anomaly detection configurations',
  }),
  ml_module: i18n.translate('xpack.fleet.epm.assetTitles.mlModules', {
    defaultMessage: 'Anomaly detection configurations',
  }),
  tag: i18n.translate('xpack.fleet.epm.assetTitles.tag', {
    defaultMessage: 'Tags',
  }),
  'osquery-pack-asset': i18n.translate('xpack.fleet.epm.assetTitles.osqueryPackAssets', {
    defaultMessage: 'Osquery packs',
  }),
  osquery_pack_asset: i18n.translate('xpack.fleet.epm.assetTitles.osqueryPackAssets', {
    defaultMessage: 'Osquery packs',
  }),
  'osquery-saved-query': i18n.translate('xpack.fleet.epm.assetTitles.osquerySavedQuery', {
    defaultMessage: 'Osquery saved queries',
  }),
  osquery_saved_query: i18n.translate('xpack.fleet.epm.assetTitles.osquerySavedQuery', {
    defaultMessage: 'Osquery saved queries',
  }),

  // ES
  ilm_policy: i18n.translate('xpack.fleet.epm.assetTitles.ilmPolicies', {
    defaultMessage: 'ILM policies',
  }),
  ingest_pipeline: i18n.translate('xpack.fleet.epm.assetTitles.ingestPipelines', {
    defaultMessage: 'Ingest pipelines',
  }),
  transform: i18n.translate('xpack.fleet.epm.assetTitles.transforms', {
    defaultMessage: 'Transforms',
  }),
  index: i18n.translate('xpack.fleet.epm.assetTitles.indices', {
    defaultMessage: 'Indices',
  }),
  index_template: i18n.translate('xpack.fleet.epm.assetTitles.indexTemplates', {
    defaultMessage: 'Index templates',
  }),
  component_template: i18n.translate('xpack.fleet.epm.assetTitles.componentTemplates', {
    defaultMessage: 'Component templates',
  }),
  data_stream_ilm_policy: i18n.translate('xpack.fleet.epm.assetTitles.dataStreamILM', {
    defaultMessage: 'Data stream ILM policies',
  }),
  ml_model: i18n.translate('xpack.fleet.epm.assetTitles.mlModels', {
    defaultMessage: 'ML models',
  }),
  view: i18n.translate('xpack.fleet.epm.assetTitles.views', {
    defaultMessage: 'Views',
  }),
};

export const ServiceTitleMap: Record<ServiceName, string> = {
  kibana: 'Kibana',
  elasticsearch: 'Elasticsearch',
};
