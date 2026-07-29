/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { SolutionView } from '../common';

export const SOLUTION_VIEW_OPTIONS: Array<{
  value: SolutionView;
  name: string;
  initialSetupName: string;
  description: string;
  icon: string;
  dataTestSubj: string;
}> = [
  {
    value: 'es',
    name: i18n.translate('xpack.spaces.solutionViewOptions.esLabel', {
      defaultMessage: 'Elasticsearch',
    }),
    initialSetupName: i18n.translate('xpack.spaces.solutionViewOptions.esInitialSetupLabel', {
      defaultMessage: 'Elasticsearch',
    }),
    description: i18n.translate('xpack.spaces.solutionViewOptions.esDescription', {
      defaultMessage: 'Build search and vector database applications.',
    }),
    icon: 'logoElasticsearch',
    dataTestSubj: 'solutionViewEsOption',
  },
  {
    value: 'oblt',
    name: i18n.translate('xpack.spaces.solutionViewOptions.obltLabel', {
      defaultMessage: 'Observability',
    }),
    initialSetupName: i18n.translate('xpack.spaces.solutionViewOptions.obltInitialSetupLabel', {
      defaultMessage: 'Elastic for Observability',
    }),
    description: i18n.translate('xpack.spaces.solutionViewOptions.obltDescription', {
      defaultMessage: 'Monitor the health of your applications.',
    }),
    icon: 'logoObservability',
    dataTestSubj: 'solutionViewObltOption',
  },
  {
    value: 'security',
    name: i18n.translate('xpack.spaces.solutionViewOptions.securityLabel', {
      defaultMessage: 'Security',
    }),
    initialSetupName: i18n.translate('xpack.spaces.solutionViewOptions.securityInitialSetupLabel', {
      defaultMessage: 'Elastic for Security',
    }),
    description: i18n.translate('xpack.spaces.solutionViewOptions.securityDescription', {
      defaultMessage: 'Detect threats and protect your systems.',
    }),
    icon: 'logoSecurity',
    dataTestSubj: 'solutionViewSecurityOption',
  },
  {
    value: 'classic',
    name: i18n.translate('xpack.spaces.solutionViewOptions.classicLabel', {
      defaultMessage: 'Classic',
    }),
    initialSetupName: i18n.translate('xpack.spaces.solutionViewOptions.classicInitialSetupLabel', {
      defaultMessage: 'Classic (legacy)',
    }),
    description: i18n.translate('xpack.spaces.solutionViewOptions.classicDescription', {
      defaultMessage: 'Use the legacy Kibana experience with the full navigation.',
    }),
    icon: 'logoElasticStack',
    dataTestSubj: 'solutionViewClassicOption',
  },
];
