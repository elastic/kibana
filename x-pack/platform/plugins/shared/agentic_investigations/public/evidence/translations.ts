/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const referencesToggleLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.evidence.references.toggle', {
    defaultMessage: '{count, plural, one {# reference} other {# references}}',
    values: { count },
  });

export const COPY_QUERY_LABEL = i18n.translate(
  'xpack.agenticInvestigations.evidence.references.copyQuery',
  { defaultMessage: 'Copy query to clipboard' }
);

export const EXTERNAL_LINK_LABEL = i18n.translate(
  'xpack.agenticInvestigations.evidence.references.externalLink',
  { defaultMessage: 'Opens in a new tab' }
);
