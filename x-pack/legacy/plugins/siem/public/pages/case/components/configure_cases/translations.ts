/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INCIDENT_MANAGEMENT_SYSTEM_TITLE = i18n.translate(
  'xpack.siem.case.configureCases.incidentManagementSystemTitle',
  {
    defaultMessage: 'Connect to third-party incident management system',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_DESC = i18n.translate(
  'xpack.siem.case.configureCases.incidentManagementSystemDesc',
  {
    defaultMessage:
      'You may optionally connect SIEM cases to a third-party incident management system of your choosing. This will allow you to push case data as an incident in your chosen third-party system.',
  }
);

export const INCIDENT_MANAGEMENT_SYSTEM_LABEL = i18n.translate(
  'xpack.siem.case.configureCases.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);

export const NO_CONNECTOR = i18n.translate('xpack.siem.case.configureCases.noConnector', {
  defaultMessage: 'No connector selected',
});

export const ADD_NEW_CONNECTOR = i18n.translate('xpack.siem.case.configureCases.addNewConnector', {
  defaultMessage: 'Add new connector option',
});
