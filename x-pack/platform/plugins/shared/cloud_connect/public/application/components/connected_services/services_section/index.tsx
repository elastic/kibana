/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ServiceCard } from './details_card';
import { DisableServiceModal } from './disable_service_modal';
import { useServiceActions } from './use_service_actions';

interface ServiceMetadata {
  documentation_url?: string;
  service_url?: string;
  connect_url?: string;
}

interface Service {
  enabled: boolean;
  support?: {
    supported: boolean;
    minimum_stack_version?: string;
    valid_license_types?: string[];
  };
  config?: {
    region_id?: string;
  };
  metadata?: ServiceMetadata;
}

interface ServicesSectionProps {
  services: {
    auto_ops?: Service;
    eis?: Service;
  };
  onServiceUpdate: (serviceKey: string, enabled: boolean) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ services, onServiceUpdate }) => {
  const {
    loadingService,
    disableModalService,
    handleEnableService,
    handleDisableService,
    showDisableModal,
    closeDisableModal,
    handleEnableServiceByUrl,
  } = useServiceActions(onServiceUpdate);

  // Build service cards array
  const allServiceCards = [
    {
      key: 'eis',
      title: i18n.translate('xpack.cloudConnect.services.eis.title', {
        defaultMessage: 'Elastic Inference Service',
      }),
      enabled: services.eis?.enabled ?? false,
      supported: services.eis?.support?.supported ?? true,
      badgeTooltip: !services.eis?.support?.supported
        ? i18n.translate('xpack.cloudConnect.services.unsupportedTooltip', {
            defaultMessage: 'This service is not supported with the current cluster configuration.',
          })
        : undefined,
      region: services.eis?.config?.region_id ?? undefined,
      description: i18n.translate('xpack.cloudConnect.services.eis.description', {
        defaultMessage:
          'Tap into AI-powered search and chat—no ML model deployment or management needed.',
      }),
      learnMoreUrl: services.eis?.metadata?.documentation_url,
      serviceUrl: services.eis?.metadata?.service_url,
      onEnable: services.eis?.support?.supported ? () => handleEnableService('eis') : undefined,
      onDisable: () =>
        showDisableModal(
          'eis',
          i18n.translate('xpack.cloudConnect.services.eis.title', {
            defaultMessage: 'Elastic Inference Service',
          })
        ),
      isLoading: loadingService === 'eis',
    },
    {
      key: 'auto_ops',
      title: i18n.translate('xpack.cloudConnect.services.autoOps.title', {
        defaultMessage: 'AutoOps',
      }),
      enabled: services.auto_ops?.enabled ?? false,
      supported: services.auto_ops?.support?.supported ?? true,
      badgeTooltip: !services.auto_ops?.support?.supported
        ? i18n.translate('xpack.cloudConnect.services.unsupportedTooltip', {
            defaultMessage: 'This service is not supported with the current cluster configuration.',
          })
        : undefined,
      region: services.auto_ops?.config?.region_id ?? undefined,
      description: i18n.translate('xpack.cloudConnect.services.autoOps.description', {
        defaultMessage:
          'Get instant cluster diagnostics, performance tips, and cost-saving recommendations—no extra management needed.',
      }),
      learnMoreUrl: services.auto_ops?.metadata?.documentation_url,
      serviceUrl: services.auto_ops?.metadata?.service_url,
      enableServiceByUrl: services.auto_ops?.metadata?.connect_url,
      onEnable:
        services.auto_ops?.support?.supported && services.auto_ops?.metadata?.connect_url
          ? () => handleEnableServiceByUrl(services.auto_ops!.metadata!.connect_url!)
          : undefined,
      onDisable: () =>
        showDisableModal(
          'auto_ops',
          i18n.translate('xpack.cloudConnect.services.autoOps.title', {
            defaultMessage: 'AutoOps',
          })
        ),
      isLoading: loadingService === 'auto_ops',
    },
    // Synthetics Service (hardcoded as coming soon)
    {
      key: 'synthetics',
      title: i18n.translate('xpack.cloudConnect.services.synthetics.title', {
        defaultMessage: 'Synthetic',
      }),
      enabled: false,
      badge: i18n.translate('xpack.cloudConnect.services.comingSoon', {
        defaultMessage: 'COMING SOON',
      }),
      description: i18n.translate('xpack.cloudConnect.services.synthetics.description', {
        defaultMessage:
          'Proactive, automated monitoring for apps and APIs—catch issues early, get deep diagnostics, and integrate easily.',
      }),
      isCardDisabled: true,
    },
  ];

  // Sort service cards: enabled first, then disabled, coming soon always last
  const enabledCards = allServiceCards.filter((card) => card.enabled && !card.isCardDisabled);
  const disabledCards = allServiceCards.filter((card) => !card.enabled && !card.isCardDisabled);
  const comingSoonCards = allServiceCards.filter((card) => card.isCardDisabled);

  const serviceCards = [...enabledCards, ...disabledCards, ...comingSoonCards];

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
        <React.Fragment key={service.key}>
          <ServiceCard {...service} />
          {index < serviceCards.length - 1 && <EuiSpacer size="m" />}
        </React.Fragment>
      ))}

      {disableModalService && (
        <DisableServiceModal
          serviceName={disableModalService.name}
          onClose={closeDisableModal}
          onConfirm={handleDisableService}
          isLoading={loadingService === disableModalService.key}
        />
      )}
    </>
  );
};
