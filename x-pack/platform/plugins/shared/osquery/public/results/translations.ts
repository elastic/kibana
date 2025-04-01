/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const generateEmptyDataMessage = (agentsResponded: number): string =>
  i18n.translate('xpack.osquery.results.multipleAgentsResponded', {
    defaultMessage:
      '{agentsResponded, plural, one {# agent has} other {# agents have}} responded, no osquery data has been reported.',
    values: { agentsResponded },
  });

export const ERROR_ALL_RESULTS = i18n.translate('xpack.osquery.results.errorSearchDescription', {
  defaultMessage: `An error has occurred on all results search`,
});

export const FAIL_ALL_RESULTS = i18n.translate('xpack.osquery.results.failSearchDescription', {
  defaultMessage: `Failed to fetch results`,
});
