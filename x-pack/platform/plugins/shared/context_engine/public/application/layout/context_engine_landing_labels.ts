/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const landingTitle = i18n.translate('xpack.contextEngine.landing.title', {
  defaultMessage: 'Context',
});

export const landingDescriptionText = i18n.translate(
  'xpack.contextEngine.landing.descriptionText',
  {
    defaultMessage:
      'Turn raw source data into distilled context agents can use to solve problems faster.',
  }
);

export const aiIndicesTabLabel = i18n.translate('xpack.contextEngine.landing.tabs.aiIndices', {
  defaultMessage: 'AI indices',
});

export const memoryTabLabel = i18n.translate('xpack.contextEngine.landing.tabs.memory', {
  defaultMessage: 'Memory',
});
