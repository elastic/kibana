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

export const VIEW_CHECK_DETAILS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.viewCheckDetailsLabel',
  {
    defaultMessage: 'View check details',
  }
);

export const EXPAND_ROWS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.expandRowsColumn',
  {
    defaultMessage: 'Expand rows',
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

export const LAST_CHECK = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.lastCheckColumn',
  {
    defaultMessage: 'Last check',
  }
);

export const ACTIONS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.actionsColumn',
  {
    defaultMessage: 'Actions',
  }
);

export const CHECK_INDEX = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.summaryTable.checkIndexButton',
  {
    defaultMessage: 'Check index',
  }
);
