/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CHECKED = i18n.translate('ecsDataQualityDashboard.statLabels.checkedLabel', {
  defaultMessage: 'checked',
});

export const CUSTOM = i18n.translate('ecsDataQualityDashboard.statLabels.customLabel', {
  defaultMessage: 'Custom',
});

export const CUSTOM_INDEX_TOOL_TIP = (indexName: string) =>
  i18n.translate('ecsDataQualityDashboard.statLabels.customIndexToolTip', {
    values: { indexName },
    defaultMessage: 'A count of the custom field mappings in the {indexName} index',
  });

export const CUSTOM_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate('ecsDataQualityDashboard.statLabels.customPatternToolTip', {
    values: { pattern },
    defaultMessage:
      'The total count of custom field mappings, in indices matching the {pattern} pattern',
  });

export const DOCS = i18n.translate('ecsDataQualityDashboard.statLabels.docsLabel', {
  defaultMessage: 'Docs',
});

export const FIELDS = i18n.translate('ecsDataQualityDashboard.statLabels.fieldsLabel', {
  defaultMessage: 'fields',
});

export const INCOMPATIBLE = i18n.translate('ecsDataQualityDashboard.statLabels.incompatibleLabel', {
  defaultMessage: 'Incompatible',
});

export const INCOMPATIBLE_INDEX_TOOL_TIP = (indexName: string) =>
  i18n.translate('ecsDataQualityDashboard.statLabels.incompatibleIndexToolTip', {
    values: { indexName },
    defaultMessage: 'Mappings and values incompatible with ECS, in the {indexName} index',
  });

export const INCOMPATIBLE_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate('ecsDataQualityDashboard.statLabels.incompatiblePatternToolTip', {
    values: { pattern },
    defaultMessage:
      'The total count of fields incompatible with ECS, in indices matching the {pattern} pattern',
  });

export const INDEX_DOCS_COUNT_TOOL_TIP = (indexName: string) =>
  i18n.translate('ecsDataQualityDashboard.statLabels.indexDocsCountToolTip', {
    values: { indexName },
    defaultMessage: 'A count of the docs in the {indexName} index',
  });

export const INDEX_DOCS_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate('ecsDataQualityDashboard.statLabels.indexDocsPatternToolTip', {
    values: { pattern },
    defaultMessage: 'The total count of docs, in indices matching the {pattern} pattern',
  });

export const INDICES = i18n.translate('ecsDataQualityDashboard.statLabels.indicesLabel', {
  defaultMessage: 'Indices',
});

export const TOTAL_COUNT_OF_INDICES_CHECKED_MATCHING_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'ecsDataQualityDashboard.statLabels.totalCountOfIndicesCheckedMatchingPatternToolTip',
    {
      values: { pattern },
      defaultMessage: 'The total count of indices checked that match the {pattern} pattern',
    }
  );

export const TOTAL_COUNT_OF_INDICES_MATCHING_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate('ecsDataQualityDashboard.statLabels.totalCountOfIndicesMatchingPatternToolTip', {
    values: { pattern },
    defaultMessage: 'The total count of indices matching the {pattern} pattern',
  });

export const TOTAL_DOCS_TOOL_TIP = i18n.translate(
  'ecsDataQualityDashboard.statLabels.totalDocsToolTip',
  {
    defaultMessage: 'The total count of docs, in all indices',
  }
);

export const TOTAL_INCOMPATIBLE_TOOL_TIP = i18n.translate(
  'ecsDataQualityDashboard.statLabels.totalIncompatibleToolTip',
  {
    defaultMessage:
      'The total count of fields incompatible with ECS, in all indices that were checked',
  }
);

export const TOTAL_INDICES_CHECKED_TOOL_TIP = i18n.translate(
  'ecsDataQualityDashboard.statLabels.totalIndicesCheckedToolTip',
  {
    defaultMessage: 'The total count of all indices checked',
  }
);

export const TOTAL_INDICES_TOOL_TIP = i18n.translate(
  'ecsDataQualityDashboard.statLabels.totalIndicesToolTip',
  {
    defaultMessage: 'The total count of all indices',
  }
);
