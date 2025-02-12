/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CUSTOM_TEMPLATE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.thehive.customTemplateLabel',
  {
    defaultMessage: 'Custom Template',
  }
);

export const CUSTOM_TEMPLATE_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.thehive.customTemplateDescription',
  {
    defaultMessage: 'Create Your Own Template',
  }
);

export const COMPROMISED_USER_ACCOUNT_INVESTIGATION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.thehive.compromisedUserAccountInvestigationLabel',
  {
    defaultMessage: 'Compromised User Account Investigation',
  }
);

export const COMPROMISED_USER_ACCOUNT_INVESTIGATION_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.thehive.compromisedUserAccountInvestigationDescription',
  {
    defaultMessage:
      'Investigate potential account compromise using username and email observables.',
  }
);

export const MALICIOUS_FILE_ANALYSIS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.thehive.maliciousFileAnalysisLabel',
  {
    defaultMessage: 'Malicious File Analysis',
  }
);

export const MALICIOUS_FILE_ANALYSIS_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.thehive.maliciousFileAnalysisDescription',
  {
    defaultMessage: 'Analyze a potentially malicious file using its hash as an observable.',
  }
);

export const SUSPICIOUS_NETWORK_ACTIVITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.thehive.suspiciousNetworkActivityLabel',
  {
    defaultMessage: 'Suspicious Network Activity',
  }
);

export const SUSPICIOUS_NETWORK_ACTIVITY_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.thehive.suspiciousNetworkActivityDescription',
  {
    defaultMessage:
      'Investigate suspicious network activity using threat indicator IP as an observable.',
  }
);
