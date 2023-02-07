/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_LOADING_METADATA_TITLE = (pattern: string) =>
  i18n.translate('ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingMetadataTitle', {
    values: { pattern },
    defaultMessage: "Indices matching the {pattern} pattern won't checked",
  });

export const ERROR_LOADING_METADATA_BODY = ({
  error,
  pattern,
}: {
  error: string;
  pattern: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingMetadataBody', {
    values: { error, pattern },
    defaultMessage:
      "Indices matching the {pattern} pattern won't be checked, because an error occurred: {error}",
  });

export const LOADING_STATS = i18n.translate(
  'ecsDataQualityDashboard.emptyLoadingPrompt.loadingStatsPrompt',
  {
    defaultMessage: 'Loading stats',
  }
);
