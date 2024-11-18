/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_RESULTS_MATCH_YOUR_SEARCH_CRITERIA = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.noResultsMatchYourSearchCriteria',
  {
    defaultMessage: 'No results match your search criteria',
  }
);

export const CHANGE_YOUR_SEARCH_CRITERIA_OR_RUN = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.changeYourSearchCriteriaOrRun',
  {
    defaultMessage: 'Change your search criteria or run a new check',
  }
);

export const TOGGLE_HISTORICAL_RESULT_CHECKED_AT = (checkedAt: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.toggleHistoricalResultCheckedAt',
    {
      values: {
        checkedAt,
      },
      defaultMessage: 'Toggle historical result checked at {checkedAt}',
    }
  );

export const COUNTED_INCOMPATIBLE_FIELDS = (count: number) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.incompatibleFieldsWithCount', {
    values: {
      count,
    },
    defaultMessage: '{count, plural, one {Incompatible field} other {Incompatible fields}}',
  });
