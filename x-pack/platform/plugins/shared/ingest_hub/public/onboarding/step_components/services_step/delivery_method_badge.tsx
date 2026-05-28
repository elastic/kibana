/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DeliveryMethod } from '../../aws_service_matrix';

const LABELS: Record<DeliveryMethod, string> = {
  agentless: i18n.translate('xpack.ingestHub.servicesStep.deliveryMethod.agentless', {
    defaultMessage: 'Agentless',
  }),
  firehose: i18n.translate('xpack.ingestHub.servicesStep.deliveryMethod.firehose', {
    defaultMessage: 'Firehose',
  }),
  cloud_forwarder: i18n.translate('xpack.ingestHub.servicesStep.deliveryMethod.cloudForwarder', {
    defaultMessage: 'ECF',
  }),
};

const TOOLTIPS: Partial<Record<DeliveryMethod, string>> = {
  cloud_forwarder: i18n.translate(
    'xpack.ingestHub.servicesStep.deliveryMethod.cloudForwarderTooltip',
    { defaultMessage: 'EDOT Cloud Forwarder' }
  ),
};

interface DeliveryMethodBadgeProps {
  method: DeliveryMethod;
  preferred?: boolean;
}

export const DeliveryMethodBadge: React.FC<DeliveryMethodBadgeProps> = ({ method, preferred }) => {
  const tooltip = TOOLTIPS[method];
  const badge = <EuiBadge color={preferred ? 'primary' : 'default'}>{LABELS[method]}</EuiBadge>;
  return tooltip ? <EuiToolTip content={tooltip}>{badge}</EuiToolTip> : badge;
};
