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
import { useCloudConnectedAppContext } from '../../../app_context';
import type { CloudService, ServiceType } from '../../../../types';

interface ServicesSectionProps {
  services: {
    auto_ops?: CloudService;
    eis?: CloudService;
  };
  onServiceUpdate: (serviceKey: ServiceType, enabled: boolean) => void;
  subscription?: string;
  currentLicenseType?: string;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  onServiceUpdate,
  subscription,
  currentLicenseType,
}) => {
  const { autoEnablingEis } = useCloudConnectedAppContext();
  const {
    loadingService,
    disableModalService,
    handleEnableService,
    handleDisableService,
    showDisableModal,
    closeDisableModal,
    handleEnableServiceByUrl,
    handleRotateServiceApiKey,
  } = useServiceActions({ onServiceUpdate, services });

  // Check if there's an active subscription (active or trial)
  const hasActiveSubscription = subscription === 'active' || subscription === 'trial';

  // Build service cards array
  const allServiceCards = [
    {
      serviceKey: 'eis',
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
      onRotateApiKey: services.eis?.enabled ? () => handleRotateServiceApiKey('eis') : undefined,
      isLoading: loadingService === 'eis' || autoEnablingEis,
      subscriptionRequired: services.eis?.subscription?.required,
      hasActiveSubscription,
      validLicenseTypes: services.eis?.support?.valid_license_types,
      currentLicenseType,
    },
    {
      serviceKey: 'auto_ops',
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
          'Simplify cluster management with real-time issue detection, performance recommendations, and resource utilization insights.',
      }),
      learnMoreUrl: services.auto_ops?.metadata?.documentation_url,
      serviceUrl: services.auto_ops?.metadata?.service_url,
      enableServiceByUrl: services.auto_ops?.metadata?.connect_url,
      onEnable:
        services.auto_ops?.support?.supported && services.auto_ops?.metadata?.connect_url
          ? () => handleEnableServiceByUrl('auto_ops', services.auto_ops!.metadata!.connect_url!)
          : undefined,
      onDisable: () =>
        showDisableModal(
          'auto_ops',
          i18n.translate('xpack.cloudConnect.services.autoOps.title', {
            defaultMessage: 'AutoOps',
          })
        ),
      isLoading: loadingService === 'auto_ops',
      subscriptionRequired: services.auto_ops?.subscription?.required,
      hasActiveSubscription,
      validLicenseTypes: services.auto_ops?.support?.valid_license_types,
      currentLicenseType,
    },
  ];

  // Sort service cards: enabled first, then disabled
  const enabledCards = allServiceCards.filter((card) => card.enabled);
  const disabledCards = allServiceCards.filter((card) => !card.enabled);

  const serviceCards = [...enabledCards, ...disabledCards];

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.services.title"
            defaultMessage="Services"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {serviceCards.map((service, index) => (
        <React.Fragment key={service.serviceKey}>
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
