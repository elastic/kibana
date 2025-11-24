/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ServiceCard } from './details_card';
import { DisableServiceModal } from '../disable_service_modal';
import { useCloudConnectedAppContext } from '../../../app_context';
import { SERVICE_CONFIG } from '../../../../../common/constants';

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
  onRefetch: () => Promise<void>;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ services, onRefetch }) => {
  const { http, notifications } = useCloudConnectedAppContext();
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const [disableModalService, setDisableModalService] = useState<{
    key: string;
    name: string;
  } | null>(null);

  const handleEnableService = async (serviceKey: string) => {
    setLoadingService(serviceKey);
    try {
      const response = await http.put<{
        success: boolean;
        warning?: string;
        warningError?: string;
      }>('/internal/cloud_connect/cluster_details', {
        body: JSON.stringify({
          services: {
            [serviceKey]: { enabled: true },
          },
        }),
      });

      // Check if there's a warning in the response
      if (response.warning) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.cloudConnect.services.enable.warningTitle', {
            defaultMessage: 'Service enabled with warnings',
          }),
          text: response.warning,
        });
      } else {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.cloudConnect.services.enable.successTitle', {
            defaultMessage: 'Service enabled successfully',
          }),
        });
      }

      // Refetch cluster details to update the UI
      await onRefetch();
    } catch (error) {
      const errorMessage = error?.body?.message || (error as Error).message;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.cloudConnect.services.enable.errorTitle', {
          defaultMessage: 'Failed to enable service',
        }),
        text: errorMessage,
      });
    } finally {
      setLoadingService(null);
    }
  };

  const handleDisableService = async () => {
    if (!disableModalService) return;

    setLoadingService(disableModalService.key);
    try {
      const response = await http.put<{
        success: boolean;
        warning?: string;
        warningError?: string;
      }>('/internal/cloud_connect/cluster_details', {
        body: JSON.stringify({
          services: {
            [disableModalService.key]: { enabled: false },
          },
        }),
      });

      // Check if there's a warning in the response
      if (response.warning) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.cloudConnect.services.disable.warningTitle', {
            defaultMessage: 'Service disabled with warnings',
          }),
          text: response.warning,
        });
      } else {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.cloudConnect.services.disable.successTitle', {
            defaultMessage: 'Service disabled successfully',
          }),
        });
      }

      setDisableModalService(null);

      // Refetch cluster details to update the UI
      await onRefetch();
    } catch (error) {
      const errorMessage = error?.body?.message || (error as Error).message;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.cloudConnect.services.disable.errorTitle', {
          defaultMessage: 'Failed to disable service',
        }),
        text: errorMessage,
      });
    } finally {
      setLoadingService(null);
    }
  };

  const showDisableModal = (serviceKey: string, serviceName: string) => {
    setDisableModalService({ key: serviceKey, name: serviceName });
  };

  const closeDisableModal = () => {
    setDisableModalService(null);
  };

  const handleEnableServiceByUrl = (url: string) => {
    window.open(url, '_blank');
  };

  // Build service cards array
  const allServiceCards = [
    // EIS Service
    {
      key: 'eis',
      title: i18n.translate(SERVICE_CONFIG.eis.titleId, {
        defaultMessage: SERVICE_CONFIG.eis.titleDefault,
      }),
      enabled: services.eis?.enabled ?? false,
      supported: services.eis?.support?.supported ?? true,
      badgeTooltip: !services.eis?.support?.supported
        ? i18n.translate('xpack.cloudConnect.services.unsupportedTooltip', {
            defaultMessage: 'This service is not supported with the current cluster configuration.',
          })
        : undefined,
      region: services.eis?.config?.region_id
        ? `AWS, N. Virginia (${services.eis.config.region_id})`
        : undefined,
      description: i18n.translate(SERVICE_CONFIG.eis.descriptionId, {
        defaultMessage: SERVICE_CONFIG.eis.descriptionDefault,
      }),
      learnMoreUrl: services.eis?.metadata?.documentation_url,
      serviceUrl: services.eis?.metadata?.service_url,
      onEnable: services.eis?.support?.supported ? () => handleEnableService('eis') : undefined,
      onDisable: () =>
        showDisableModal(
          'eis',
          i18n.translate(SERVICE_CONFIG.eis.titleId, {
            defaultMessage: SERVICE_CONFIG.eis.titleDefault,
          })
        ),
      isLoading: loadingService === 'eis',
    },
    // AutoOps Service
    {
      key: 'auto_ops',
      title: i18n.translate(SERVICE_CONFIG.auto_ops.titleId, {
        defaultMessage: SERVICE_CONFIG.auto_ops.titleDefault,
      }),
      enabled: services.auto_ops?.enabled ?? false,
      supported: services.auto_ops?.support?.supported ?? true,
      badgeTooltip: !services.auto_ops?.support?.supported
        ? i18n.translate('xpack.cloudConnect.services.unsupportedTooltip', {
            defaultMessage: 'This service is not supported with the current cluster configuration.',
          })
        : undefined,
      region: services.auto_ops?.config?.region_id ? services.auto_ops.config.region_id : undefined,
      description: i18n.translate(SERVICE_CONFIG.auto_ops.descriptionId, {
        defaultMessage: SERVICE_CONFIG.auto_ops.descriptionDefault,
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
          i18n.translate(SERVICE_CONFIG.auto_ops.titleId, {
            defaultMessage: SERVICE_CONFIG.auto_ops.titleDefault,
          })
        ),
      isLoading: loadingService === 'auto_ops',
    },
    // Synthetics Service (hardcoded as coming soon)
    {
      key: 'synthetics',
      title: i18n.translate(SERVICE_CONFIG.synthetics.titleId, {
        defaultMessage: SERVICE_CONFIG.synthetics.titleDefault,
      }),
      enabled: false,
      badge: i18n.translate('xpack.cloudConnect.services.comingSoon', {
        defaultMessage: 'COMING SOON',
      }),
      description: i18n.translate(SERVICE_CONFIG.synthetics.descriptionId, {
        defaultMessage: SERVICE_CONFIG.synthetics.descriptionDefault,
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
