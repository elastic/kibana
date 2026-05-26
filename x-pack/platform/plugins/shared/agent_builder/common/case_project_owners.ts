/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Cases `owner` values supported when linking a case-typed Agent Builder project. */
export const CASE_PROJECT_OWNER_OPTIONS = [
  {
    value: 'securitySolution',
    label: i18n.translate('xpack.agentBuilder.projects.caseOwner.security', {
      defaultMessage: 'Security',
    }),
  },
  {
    value: 'observability',
    label: i18n.translate('xpack.agentBuilder.projects.caseOwner.observability', {
      defaultMessage: 'Observability',
    }),
  },
  {
    value: 'cases',
    label: i18n.translate('xpack.agentBuilder.projects.caseOwner.stack', {
      defaultMessage: 'Stack (Management)',
    }),
  },
] as const;

export type CaseProjectOwner = (typeof CASE_PROJECT_OWNER_OPTIONS)[number]['value'];
