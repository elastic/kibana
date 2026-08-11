/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { SupportedSolutionView } from './types';

export const SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX = 'spaces.solutionViewSwitch';

export const SOLUTION_VIEW_CONFIG: Record<SupportedSolutionView, { name: string; icon: string }> = {
  es: {
    name: i18n.translate('xpack.spaces.solutionViewSwitch.solutionViewName.es', {
      defaultMessage: 'Elasticsearch',
    }),
    icon: 'logoElasticsearch',
  },
  oblt: {
    name: i18n.translate('xpack.spaces.solutionViewSwitch.solutionViewName.oblt', {
      defaultMessage: 'Observability',
    }),
    icon: 'logoObservability',
  },
  security: {
    name: i18n.translate('xpack.spaces.solutionViewSwitch.solutionViewName.security', {
      defaultMessage: 'Security',
    }),
    icon: 'logoSecurity',
  },
};
