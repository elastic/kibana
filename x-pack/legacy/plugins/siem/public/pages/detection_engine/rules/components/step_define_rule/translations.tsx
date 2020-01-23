/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const CUSTOM_QUERY_REQUIRED = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.customQueryFieldRequiredError',
  {
    defaultMessage: 'A custom query is required.',
  }
);

export const INVALID_CUSTOM_QUERY = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.customQueryFieldInvalidError',
  {
    defaultMessage: 'The KQL is invalid',
  }
);

export const CONFIG_INDICES = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.indicesFromConfigDescription',
  {
    defaultMessage: 'Use Elasticsearch indices from SIEM advanced settings',
  }
);

export const CUSTOM_INDICES = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.indicesCustomDescription',
  {
    defaultMessage: 'Provide custom list of indices',
  }
);

export const INDEX_HELPER_TEXT = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.indicesHelperDescription',
  {
    defaultMessage:
      'Enter the pattern of Elasticsearch indices where you would like this rule to run. By default, these will include index patterns defined in SIEM advanced settings.',
  }
);

export const RESET_DEFAULT_INDEX = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.resetDefaultIndicesButton',
  {
    defaultMessage: 'Reset to default index patterns',
  }
);

export const IMPORT_TIMELINE_QUERY = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.importTimelineQueryButton',
  {
    defaultMessage: 'Import query from saved timeline',
  }
);
