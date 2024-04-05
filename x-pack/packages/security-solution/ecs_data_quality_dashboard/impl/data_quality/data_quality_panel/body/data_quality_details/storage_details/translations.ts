/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DOCS_UNIT = (totalCount: number) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.storage.docs.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {doc} other {docs}}`,
  });
