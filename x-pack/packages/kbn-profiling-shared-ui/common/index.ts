/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NOT_AVAILABLE_LABEL = i18n.translate('xpack.profiling.notAvailableLabel', {
  defaultMessage: 'N/A',
});

export enum AddDataTabs {
  Kubernetes = 'kubernetes',
  Docker = 'docker',
  Binary = 'binary',
  Deb = 'deb',
  RPM = 'rpm',
  ElasticAgentIntegration = 'elasticAgentIntegration',
  Symbols = 'symbols',
}

export const PROFILING_FEEDBACK_LINK = 'https://ela.st/profiling-feedback';
