/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CHECKED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.checkedLabel',
  {
    defaultMessage: 'checked',
  }
);

export const CUSTOM = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.customLabel',
  {
    defaultMessage: 'Custom',
  }
);

export const CUSTOM_INDEX_TOOL_TIP = (indexName: string) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.statLabels.customIndexToolTip', {
    values: { indexName },
    defaultMessage: 'A count of the custom field mappings in the {indexName} index',
  });

export const CUSTOM_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.customPatternToolTip',
    {
      values: { pattern },
      defaultMessage:
        'The total count of custom field mappings, in indices matching the {pattern} pattern',
    }
  );

export const DOCS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.docsLabel',
  {
    defaultMessage: 'Docs',
  }
);

export const FIELDS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.fieldsLabel',
  {
    defaultMessage: 'fields',
  }
);

export const INCOMPATIBLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.incompatibleLabel',
  {
    defaultMessage: 'Incompatible',
  }
);

export const INCOMPATIBLE_INDEX_TOOL_TIP = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.incompatibleIndexToolTip',
    {
      values: { indexName },
      defaultMessage: 'Mappings and values incompatible with ECS, in the {indexName} index',
    }
  );

export const INCOMPATIBLE_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.incompatiblePatternToolTip',
    {
      values: { pattern },
      defaultMessage:
        'The total count of fields incompatible with ECS, in indices matching the {pattern} pattern',
    }
  );

export const INDEX_DOCS_COUNT_TOOL_TIP = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.indexDocsCountToolTip',
    {
      values: { indexName },
      defaultMessage: 'A count of the docs in the {indexName} index',
    }
  );

export const INDEX_DOCS_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.indexDocsPatternToolTip',
    {
      values: { pattern },
      defaultMessage: 'The total count of docs, in indices matching the {pattern} pattern',
    }
  );

export const INDICES = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.indicesLabel',
  {
    defaultMessage: 'Indices',
  }
);

export const SAME_FAMILY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.sameFamilyLabel',
  {
    defaultMessage: 'Same family',
  }
);

export const SAME_FAMILY_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.sameFamilyPatternToolTip',
    {
      values: { pattern },
      defaultMessage:
        'The total count of fields in the same family as the type specified by ECS, in indices matching the {pattern} pattern',
    }
  );

export const SIZE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.sizeLabel',
  {
    defaultMessage: 'Size',
  }
);

export const INDICES_SIZE_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.indicesSizePatternToolTip',
    {
      values: { pattern },
      defaultMessage:
        'The total size of the primary indices matching the {pattern} pattern (does not include replicas)',
    }
  );

export const TOTAL_COUNT_OF_INDICES_CHECKED_MATCHING_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalCountOfIndicesCheckedMatchingPatternToolTip',
    {
      values: { pattern },
      defaultMessage: 'The total count of indices checked that match the {pattern} pattern',
    }
  );

export const TOTAL_COUNT_OF_INDICES_MATCHING_PATTERN_TOOL_TIP = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalCountOfIndicesMatchingPatternToolTip',
    {
      values: { pattern },
      defaultMessage: 'The total count of indices matching the {pattern} pattern',
    }
  );

export const TOTAL_DOCS_TOOL_TIP = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalDocsToolTip',
  {
    defaultMessage: 'The total count of docs, in all indices',
  }
);

export const TOTAL_INCOMPATIBLE_TOOL_TIP = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalIncompatibleToolTip',
  {
    defaultMessage:
      'The total count of fields incompatible with ECS, in all indices that were checked',
  }
);

export const TOTAL_INDICES_CHECKED_TOOL_TIP = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalIndicesCheckedToolTip',
  {
    defaultMessage: 'The total count of all indices checked',
  }
);

export const TOTAL_INDICES_TOOL_TIP = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalIndicesToolTip',
  {
    defaultMessage: 'The total count of all indices',
  }
);

export const TOTAL_SAME_FAMILY_TOOL_TIP = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalSameFamilyToolTip',
  {
    defaultMessage:
      'The total count of fields in the same family as the ECS type, in all indices that were checked',
  }
);

export const TOTAL_SIZE_TOOL_TIP = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.statLabels.totalSizeToolTip',
  {
    defaultMessage: 'The total size of all primary indices (does not include replicas)',
  }
);
