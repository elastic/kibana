/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const LOCATION = i18n.translate('xpack.siem.network.ipDetails.ipOverview.locationTitle', {
  defaultMessage: 'Location',
});

export const AUTONOMOUS_SYSTEM = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.autonomousSystemTitle',
  {
    defaultMessage: 'Autonomous system',
  }
);

export const MAX_ANOMALY_SCORE_BY_JOB = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.maxAnomalyScoreByJobTitle',
  {
    defaultMessage: 'Max anomaly score by job',
  }
);

export const FIRST_SEEN = i18n.translate('xpack.siem.network.ipDetails.ipOverview.firstSeenTitle', {
  defaultMessage: 'First seen',
});

export const LAST_SEEN = i18n.translate('xpack.siem.network.ipDetails.ipOverview.lastSeenTitle', {
  defaultMessage: 'Last seen',
});

export const HOST_ID = i18n.translate('xpack.siem.network.ipDetails.ipOverview.hostIdTitle', {
  defaultMessage: 'Host ID',
});

export const HOST_NAME = i18n.translate('xpack.siem.network.ipDetails.ipOverview.hostNameTitle', {
  defaultMessage: 'Host name',
});

export const WHOIS = i18n.translate('xpack.siem.network.ipDetails.ipOverview.whoIsTitle', {
  defaultMessage: 'WhoIs',
});

export const VIEW_WHOIS = i18n.translate('xpack.siem.network.ipDetails.ipOverview.viewWhoisTitle', {
  defaultMessage: 'iana.org',
});

export const REPUTATION = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.ipReputationTitle',
  {
    defaultMessage: 'Reputation',
  }
);

export const VIEW_VIRUS_TOTAL = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.viewVirusTotalTitle.',
  {
    defaultMessage: 'virustotal.com',
  }
);

export const VIEW_TALOS_INTELLIGENCE = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.viewTalosIntelligenceTitle',
  {
    defaultMessage: 'talosIntelligence.com',
  }
);

export const AS_SOURCE = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.asSourceDropDownOptionLabel',
  {
    defaultMessage: 'As Source',
  }
);
export const AS_DESTINATION = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.asDestinationDropDownOptionLabel',
  {
    defaultMessage: 'As Destination',
  }
);

export const INSPECT_TITLE = i18n.translate(
  'xpack.siem.network.ipDetails.ipOverview.inspectTitle',
  {
    defaultMessage: 'IP overview',
  }
);
