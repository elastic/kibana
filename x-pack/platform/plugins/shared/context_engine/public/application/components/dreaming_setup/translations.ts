/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const customHelpText = i18n.translate(
  'xpack.contextEngine.dreamingTemplate.customHelpText',
  {
    defaultMessage: 'Start empty and add your own fact types.',
  }
);

export const summaryLabel = i18n.translate('xpack.contextEngine.dreamingTemplate.summaryLabel', {
  defaultMessage: 'Describe your company, your agent and the knowledge it needs',
});

export const summaryHelpText = i18n.translate(
  'xpack.contextEngine.dreamingTemplate.summaryHelpText',
  {
    defaultMessage: 'Your description opens the instructions dreaming follows.',
  }
);

export const applyDisabledTitle = i18n.translate(
  'xpack.contextEngine.dreamingTemplate.applyDisabled',
  {
    defaultMessage: 'Add a fact type, or turn on entities, for dreaming to learn something.',
  }
);

export const saveChangesLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.save', {
  defaultMessage: 'Save changes',
});

export const discardChangesLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.discard',
  {
    defaultMessage: 'Discard changes',
  }
);

export const loadErrorTitle = i18n.translate(
  'xpack.contextEngine.dreamingTemplate.loadErrorTitle',
  {
    defaultMessage: 'Unable to load the examples',
  }
);
