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

/** List-card status next to the age while a worker is running. */
export const IN_PROGRESS_LABEL = i18n.translate(
  'xpack.agenticInvestigations.investigations.inProgressLabel',
  { defaultMessage: 'In progress' }
);

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
