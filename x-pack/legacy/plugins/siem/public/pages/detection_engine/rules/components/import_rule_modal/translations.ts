/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const IMPORT_RULE = i18n.translate(
  'xpack.siem.detectionEngine.components.importRuleModal.importRuleTitle',
  {
    defaultMessage: 'Import rule',
  }
);

export const SELECT_RULE = i18n.translate(
  'xpack.siem.detectionEngine.components.importRuleModal.selectRuleDescription',
  {
    defaultMessage: 'Select a SIEM rule (as exported from the Detection Engine UI) to import',
  }
);

export const INITIAL_PROMPT_TEXT = i18n.translate(
  'xpack.siem.detectionEngine.components.importRuleModal.initialPromptTextDescription',
  {
    defaultMessage: 'Select or drag and drop a valid rules_export.ndjson file',
  }
);

export const OVERWRITE_WITH_SAME_NAME = i18n.translate(
  'xpack.siem.detectionEngine.components.importRuleModal.overwriteDescription',
  {
    defaultMessage: 'Automatically overwrite saved objects with the same rule ID',
  }
);

export const CANCEL_BUTTON = i18n.translate(
  'xpack.siem.detectionEngine.components.importRuleModal.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const SUCCESSFULLY_IMPORTED_RULES = (totalRules: number) =>
  i18n.translate(
    'xpack.siem.detectionEngine.components.importRuleModal.successfullyImportedRulesTitle',
    {
      values: { totalRules },
      defaultMessage:
        'Successfully imported {totalRules} {totalRules, plural, =1 {rule} other {rules}}',
    }
  );

export const IMPORT_FAILED = i18n.translate(
  'xpack.siem.detectionEngine.components.importRuleModal.importFailedTitle',
  {
    defaultMessage: 'Failed to import rules',
  }
);

export const IMPORT_FAILED_DETAILED = (ruleId: string, statusCode: number, message: string) =>
  i18n.translate(
    'xpack.siem.detectionEngine.components.importRuleModal.importFailedDetailedTitle',
    {
      values: { ruleId, statusCode, message },
      defaultMessage: 'Rule ID: {ruleId}\n Status Code: {statusCode}\n Message: {message}',
    }
  );
