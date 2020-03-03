/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PRE_BUILT_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.rules.prePackagedRules.emptyPromptTitle',
  {
    defaultMessage: 'Load Elastic prebuilt detection rules',
  }
);

export const PRE_BUILT_MSG = i18n.translate(
  'xpack.siem.detectionEngine.rules.prePackagedRules.emptyPromptMessage',
  {
    defaultMessage:
      'Elastic SIEM comes with prebuilt detection rules that run in the background and create signals when their conditions are met. By default, all prebuilt rules are disabled and you select which rules you want to activate.',
  }
);

export const PRE_BUILT_ACTION = i18n.translate(
  'xpack.siem.detectionEngine.rules.prePackagedRules.loadPreBuiltButton',
  {
    defaultMessage: 'Load prebuilt detection rules',
  }
);

export const CREATE_RULE_ACTION = i18n.translate(
  'xpack.siem.detectionEngine.rules.prePackagedRules.createOwnRuletButton',
  {
    defaultMessage: 'Create your own rules',
  }
);

export const UPDATE_PREPACKAGED_RULES_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.rules.updatePrePackagedRulesTitle',
  {
    defaultMessage: 'Update available for Elastic prebuilt rules',
  }
);

export const UPDATE_PREPACKAGED_RULES_MSG = (updateRules: number) =>
  i18n.translate('xpack.siem.detectionEngine.rules.updatePrePackagedRulesMsg', {
    values: { updateRules },
    defaultMessage:
      'You can update {updateRules} Elastic prebuilt {updateRules, plural, =1 {rule} other {rules}}. Note that this will reload deleted Elastic prebuilt rules.',
  });

export const UPDATE_PREPACKAGED_RULES = (updateRules: number) =>
  i18n.translate('xpack.siem.detectionEngine.rules.updatePrePackagedRulesButton', {
    values: { updateRules },
    defaultMessage:
      'Update {updateRules} Elastic prebuilt {updateRules, plural, =1 {rule} other {rules}} ',
  });
