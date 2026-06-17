/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INCIDENT_FIELDS_API_ERROR = i18n.translate(
  'xpack.cases.connectors.resilient.unableToGetFieldsMessage',
  {
    defaultMessage: 'Unable to get fields metadata',
  }
);

export const INCIDENT_TYPES_PLACEHOLDER = i18n.translate(
  'xpack.cases.connectors.resilient.incidentTypesPlaceholder',
  {
    defaultMessage: 'Choose types',
  }
);

export const INCIDENT_TYPES_LABEL = i18n.translate(
  'xpack.cases.connectors.resilient.incidentTypesLabel',
  {
    defaultMessage: 'Incident types',
  }
);

export const SEVERITY_LABEL = i18n.translate('xpack.cases.connectors.resilient.severityLabel', {
  defaultMessage: 'Severity',
});

export const ADDITIONAL_FIELDS_LABEL = i18n.translate(
  'xpack.cases.connectors.resilient.additionalFieldsLabel',
  {
    defaultMessage: 'Additional Fields',
  }
);

export const ADDITIONAL_FIELDS_PLACEHOLDER = i18n.translate(
  'xpack.cases.connectors.resilient.additionalFieldsPlaceholder',
  {
    defaultMessage: 'Choose IBM Resilient fields',
  }
);

export const ADDITIONAL_FIELDS_HELP_TEXT = i18n.translate(
  'xpack.cases.connectors.resilient.additionalFieldsHelpText',
  {
    defaultMessage: 'Add additional IBM Resilient fields.',
  }
);
