/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ServiceCardProps } from './details_card';
import { ServiceCard } from './details_card';

interface Service {
  enabled: boolean;
  supported: boolean;
  config?: {
    region_id?: string;
  };
}

interface ServicesSectionProps {
  services: {
    auto_ops?: Service;
    eis?: Service;
  };
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ services }) => {
  const serviceCards: ServiceCardProps[] = [
    {
      title: 'Elastic Inference Service',
      enabled: services.eis?.enabled ?? false,
      region: services.eis?.config?.region_id
        ? `AWS, N. Virginia (${services.eis.config.region_id})`
        : undefined,
      description: 'Description.',
      learnMoreUrl:
        'https://www.elastic.co/guide/en/elasticsearch/reference/current/inference-apis.html',
      actionLabel: services.eis?.enabled ? 'Open' : 'Connect',
      onAction: services.eis?.enabled ? () => {} : () => {},
    },
    {
      title: 'AutoOps',
      enabled: services.auto_ops?.enabled ?? false,
      description: 'Advanced monitoring for your Self-managed cluster.',
      learnMoreUrl: 'https://www.elastic.co/guide/en/cloud/current/ec-autops.html',
      actionLabel: services.auto_ops?.enabled ? 'Open' : 'Connect',
      onAction: services.auto_ops?.enabled ? () => {} : () => {},
    },
    {
      title: 'Synthetics',
      enabled: false,
      badge: 'Coming soon',
      description: 'Description.',
      learnMoreUrl:
        'https://www.elastic.co/guide/en/observability/current/synthetics-get-started.html',
      isCardDisabled: true,
    },
  ];

  return (
    <>
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.services.title"
            defaultMessage="Services"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {serviceCards.map((service, index) => (
        <React.Fragment key={service.title}>
          <ServiceCard {...service} />
          {index < serviceCards.length - 1 && <EuiSpacer size="m" />}
        </React.Fragment>
      ))}
    </>
  );
};
