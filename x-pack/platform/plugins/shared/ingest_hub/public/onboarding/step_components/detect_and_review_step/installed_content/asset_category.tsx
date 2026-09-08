/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiIcon,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AssetRow } from './asset_row';

/**
 * Maps a KibanaSavedObjectType / ElasticsearchAssetType to an EUI icon type.
 *
 * Fleet's AssetTitleMap (which we import for labels) provides no icon mapping —
 * Fleet's own assets accordion renders titles only. This map is therefore
 * ingest_hub-specific and is not a duplicate of anything in Fleet.
 */
const ASSET_TYPE_ICON: Record<string, string> = {
  dashboard: 'dashboardApp',
  lens: 'lensApp',
  visualization: 'visualizeApp',
  search: 'discoverApp',
  'index-pattern': 'indexPatternApp',
  index_pattern: 'indexPatternApp',
  map: 'gisApp',
  'ml-module': 'machineLearningApp',
  ml_module: 'machineLearningApp',
  'security-rule': 'securityApp',
  security_rule: 'securityApp',
  'security-ai-prompt': 'securityApp',
  security_ai_prompt: 'securityApp',
  'csp-rule-template': 'securityApp',
  csp_rule_template: 'securityApp',
  alerting_rule_template: 'bell',
  slo_template: 'bullseye',
  'osquery-pack-asset': 'tableDensityExpanded',
  'osquery-saved-query': 'tableDensityExpanded',
  tag: 'tag',
  alert: 'bell',
  // Elasticsearch types
  index_template: 'indexOpen',
  component_template: 'indexOpen',
  ingest_pipeline: 'logstashInput',
  ilm_policy: 'clock',
  data_stream_ilm_policy: 'clock',
  transform: 'compute',
  ml_model: 'machineLearningApp',
  knowledge_base: 'database',
  esql_view: 'esqlVis',
};

const DEFAULT_ICON = 'package';

interface AssetCategoryProps {
  categoryId: string;
  /** Pre-translated display title (e.g. from AssetTitleMap). Rendered directly — not
   * wrapped in FormattedMessage so the i18n extractor doesn't see a dynamic id. */
  title: string;
  assets: Array<{ id: string; title: string; appLink?: string }>;
}

export function AssetCategory({ categoryId, title, assets }: AssetCategoryProps) {
  const iconType = ASSET_TYPE_ICON[categoryId] ?? DEFAULT_ICON;

  const installedLabel = i18n.translate(
    'xpack.ingestHub.detectAndReviewStep.installedContent.category.installedCount',
    {
      defaultMessage: '{count} of {total} installed',
      values: { count: assets.length, total: assets.length },
    }
  );

  return (
    <EuiAccordion
      id={`assetCategory-${categoryId}`}
      initialIsOpen={false}
      extraAction={
        <EuiText size="xs" color="subdued">
          {installedLabel}
        </EuiText>
      }
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiIcon type={iconType} size="m" aria-hidden />
          <EuiTitle size="xxs">
            <h4>{title}</h4>
          </EuiTitle>
          <EuiNotificationBadge color="subdued">{assets.length}</EuiNotificationBadge>
        </EuiFlexGroup>
      }
      data-test-subj={`assetCategory-${categoryId}`}
    >
      <EuiSpacer size="s" />
      {assets.map((asset) => (
        <React.Fragment key={asset.id}>
          <AssetRow id={asset.id} title={asset.title} appLink={asset.appLink} />
          <EuiSpacer size="xs" />
        </React.Fragment>
      ))}
    </EuiAccordion>
  );
}
