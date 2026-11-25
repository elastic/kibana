/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const examplesLabel = i18n.translate('xpack.contextEngine.dreamingTemplate.examplesLabel', {
  defaultMessage: 'What are you building?',
});

export const customHelpText = i18n.translate(
  'xpack.contextEngine.dreamingTemplate.customHelpText',
  {
    defaultMessage: 'Start empty and add your own fact types.',
  }
);

export const customLabel = i18n.translate('xpack.contextEngine.dreamingTemplate.custom', {
  defaultMessage: 'Custom',
});

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

export const applyButtonLabel = i18n.translate('xpack.contextEngine.dreamingTemplate.applyButton', {
  defaultMessage: 'Turn on dreaming',
});

export const loadErrorTitle = i18n.translate(
  'xpack.contextEngine.dreamingTemplate.loadErrorTitle',
  {
    defaultMessage: 'Unable to load the examples',
  }
);

export const startFromLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.setup.startFrom',
  {
    defaultMessage: 'Start from',
  }
);

export const enableDreamingLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.setup.enableLabel',
  {
    defaultMessage: 'Enable dreaming',
  }
);

export const notSetUpDescription = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.notSetUpTitle',
  {
    defaultMessage: 'Dreaming is not set up. Choose what this AI index learns from its memories.',
  }
);

export const learnsTitle = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.learnsTitle',
  {
    defaultMessage: 'What dreaming learns',
  }
);

export const learnsDescription = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.dreaming.learnsDescription',
  {
    defaultMessage: 'Fact types always. Entity and relationship types when entities are on.',
  }
);
