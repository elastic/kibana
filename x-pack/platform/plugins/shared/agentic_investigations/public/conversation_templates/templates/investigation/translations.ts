/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RUNNING_LABEL = i18n.translate(
  'xpack.agenticInvestigations.investigations.runningLabel',
  { defaultMessage: 'Investigating…' }
);

export const NO_SEVERITY_LABEL = i18n.translate(
  'xpack.agenticInvestigations.investigations.noSeverityLabel',
  { defaultMessage: 'Not rated' }
);

export const CLOSED_LABEL = i18n.translate(
  'xpack.agenticInvestigations.investigations.closedLabel',
  { defaultMessage: 'Closed' }
);

export const pendingProposalsLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.investigations.pendingProposals', {
    defaultMessage: '{count, plural, one {# proposal to review} other {# proposals to review}}',
    values: { count },
  });

export const moreEntitiesLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.investigations.moreEntities', {
    defaultMessage: '+{count}',
    values: { count },
  });

/** Shown for an investigation Agent Builder has not titled yet and that has no subject to name. */
export const NEW_INVESTIGATION_TITLE = i18n.translate(
  'xpack.agenticInvestigations.investigations.newInvestigationTitle',
  { defaultMessage: 'New investigation' }
);
