/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_FORM_CANCEL_MODAL_TITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.cancelModal.title',
  {
    defaultMessage: 'Discard unsaved changes to rule?',
  }
);

export const RULE_FORM_CANCEL_MODAL_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.cancelModal.description',
  {
    defaultMessage: "You can't recover unsaved changes.",
  }
);

export const RULE_FORM_CANCEL_MODAL_CONFIRM = i18n.translate(
  'xpack.alertingV2.ruleForm.cancelModal.confirm',
  {
    defaultMessage: 'Discard changes',
  }
);

export const RULE_FORM_CANCEL_MODAL_CANCEL = i18n.translate(
  'xpack.alertingV2.ruleForm.cancelModal.cancel',
  {
    defaultMessage: 'Continue editing',
  }
);
