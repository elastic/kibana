/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BODY = i18n.translate('ecsDataQualityDashboard.ilmPhasesEmptyPromptBody', {
  defaultMessage:
    'Indices with these Index Lifecycle Management (ILM) phases will be checked for data quality',
});

export const COLD = i18n.translate('ecsDataQualityDashboard.ilmPhasesEmptyPromptColdLabel', {
  defaultMessage: 'cold',
});

export const FROZEN = i18n.translate('ecsDataQualityDashboard.ilmPhasesEmptyPromptFrozenLabel', {
  defaultMessage: 'frozen',
});

export const HOT = i18n.translate('ecsDataQualityDashboard.ilmPhasesEmptyPromptHotLabel', {
  defaultMessage: 'hot',
});

export const ILM_PHASES_THAT_CAN_BE_CHECKED = i18n.translate(
  'ecsDataQualityDashboard.ilmPhasesEmptyPromptIlmPhasesThatCanBeCheckedSubtitle',
  {
    defaultMessage: 'ILM phases that can be checked for data quality',
  }
);

export const ILM_PHASES_THAT_CANNOT_BE_CHECKED = i18n.translate(
  'ecsDataQualityDashboard.ilmPhasesEmptyPromptIlmPhasesThatCannotBeCheckedSubtitle',
  {
    defaultMessage: 'ILM phases that cannot be checked',
  }
);

export const THE_FOLLOWING_ILM_PHASES = i18n.translate(
  'ecsDataQualityDashboard.ilmPhasesEmptyPromptITheFollowingIlmPhasesLabel',
  {
    defaultMessage:
      'The following ILM phases cannot be checked for data quality because they are slower to access',
  }
);

export const UNMANAGED = i18n.translate(
  'ecsDataQualityDashboard.ilmPhasesEmptyPromptUnmanagedLabel',
  {
    defaultMessage: 'unmanaged',
  }
);

export const WARM = i18n.translate('ecsDataQualityDashboard.ilmPhasesEmptyPromptWarmLabel', {
  defaultMessage: 'warm',
});

export const TITLE = i18n.translate('ecsDataQualityDashboard.ilmPhasesEmptyPromptTitle', {
  defaultMessage: 'Select one or more ILM phases',
});
