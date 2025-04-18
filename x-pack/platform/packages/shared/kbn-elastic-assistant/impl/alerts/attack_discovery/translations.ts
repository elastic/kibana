/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_PART = i18n.translate(
  'xpack.elasticAssistant.alertSummary.attackDiscovery.alertPart',
  {
    defaultMessage: 'This alert is part of a',
  }
);

export const VIEW_DETAILS = i18n.translate(
  'xpack.elasticAssistant.alertSummary.attackDiscovery.viewDetails',
  {
    defaultMessage: 'View details in Attack Discovery',
  }
);

export const ALERTS = i18n.translate('xpack.elasticAssistant.alertSummary.attackDiscovery.alerts', {
  defaultMessage: 'Alerts:',
});

export const ATTACK_CHAIN = i18n.translate(
  'xpack.elasticAssistant.alertSummary.attackDiscovery.attackChainLabel',
  {
    defaultMessage: 'Attack chain:',
  }
);
export const ATTACK_CHAIN_TOOLTIP = (tacticsCount: number) =>
  i18n.translate(
    'xpack.elasticAssistant.alertSummary.attackDiscovery.miniAttackChain.attackChainTooltip',
    {
      defaultMessage:
        '{tacticsCount} {tacticsCount, plural, one {tactic was} other {tactics were}} identified in the attack:',
      values: { tacticsCount },
    }
  );

export const NO_RESULTS = i18n.translate(
  'xpack.elasticAssistant.alertSummary.attackDiscovery.noResults',
  {
    defaultMessage: 'Not part of any attack discoveries',
  }
);
