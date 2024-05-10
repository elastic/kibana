/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLLAPSE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.collapseLabel',
  {
    defaultMessage: 'Collapse',
  }
);

export const DOCS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.docsColumn',
  {
    defaultMessage: 'Docs',
  }
);

export const EXPAND = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.expandLabel',
  {
    defaultMessage: 'Expand',
  }
);

export const EXPAND_ROWS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.expandRowsColumn',
  {
    defaultMessage: 'Expand rows',
  }
);

export const FAILED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.failedTooltip',
  {
    defaultMessage: 'Failed',
  }
);

export const ILM_PHASE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.ilmPhaseColumn',
  {
    defaultMessage: 'ILM Phase',
  }
);

export const INCOMPATIBLE_FIELDS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.incompatibleFieldsColumn',
  {
    defaultMessage: 'Incompatible fields',
  }
);

export const INDICES = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.indicesColumn',
  {
    defaultMessage: 'Indices',
  }
);

export const INDICES_CHECKED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.indicesCheckedColumn',
  {
    defaultMessage: 'Indices checked',
  }
);

export const INDEX = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.indexColumn',
  {
    defaultMessage: 'Index',
  }
);

export const INDEX_NAME_LABEL = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.indexesNameLabel',
  {
    defaultMessage: 'Index name',
  }
);

export const INDEX_TOOL_TIP = (pattern: string) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.summaryTable.indexToolTip', {
    values: { pattern },
    defaultMessage: 'This index matches the pattern or index name: {pattern}',
  });

export const PASSED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.passedTooltip',
  {
    defaultMessage: 'Passed',
  }
);

export const RESULT = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.resultColumn',
  {
    defaultMessage: 'Result',
  }
);

export const SIZE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.sizeColumn',
  {
    defaultMessage: 'Size',
  }
);

export const LAST_CHECK = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.lastCheckColumn',
  {
    defaultMessage: 'Last check',
  }
);

export const THIS_INDEX_HAS_NOT_BEEN_CHECKED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.thisIndexHasNotBeenCheckedTooltip',
  {
    defaultMessage: 'This index has not been checked',
  }
);
