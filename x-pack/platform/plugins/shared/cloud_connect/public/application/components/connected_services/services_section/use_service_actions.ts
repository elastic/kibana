/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useCloudConnectedAppContext } from '../../../app_context';
import type { CloudService, ServiceType } from '../../../../types';

interface DisableModalService {
  key: string;
  name: string;
}

interface UseServiceActionsParams {
  onServiceUpdate: (serviceKey: ServiceType, enabled: boolean) => void;
  services: {
    auto_ops?: CloudService;
    eis?: CloudService;
  };
}

export const useServiceActions = ({ onServiceUpdate, services }: UseServiceActionsParams) => {
  const { notifications, telemetryService, apiService } = useCloudConnectedAppContext();

  // Tracks which service is currently being updated (for loading spinner)
  const [loadingService, setLoadingService] = useState<string | null>(null);

  // Tracks the service pending disable confirmation (for modal)
  const [disableModalService, setDisableModalService] = useState<DisableModalService | null>(null);

  /**
   * Core function to enable or disable a service via API.
   * On success, optimistically updates the UI via onServiceUpdate callback.
   */
  const handleServiceUpdate = async (serviceKey: ServiceType, enabled: boolean) => {
    setLoadingService(serviceKey);

    const { data, error } = await apiService.updateServices({
      [serviceKey]: { enabled },
    });

    if (error) {
      notifications.toasts.addDanger({
        title: enabled
          ? i18n.translate('xpack.cloudConnect.services.enable.errorTitle', {
              defaultMessage: 'Failed to enable service',
            })
          : i18n.translate('xpack.cloudConnect.services.disable.errorTitle', {
              defaultMessage: 'Failed to disable service',
            }),
        text: error.message,
      });
      setLoadingService(null);
      return;
    }

    if (data?.warning) {
      notifications.toasts.addWarning({
        title: enabled
          ? i18n.translate('xpack.cloudConnect.services.enable.warningTitle', {
              defaultMessage: 'Service enabled with warnings',
            })
          : i18n.translate('xpack.cloudConnect.services.disable.warningTitle', {
              defaultMessage: 'Service disabled with warnings',
            }),
        text: data.warning,
      });
    } else {
      notifications.toasts.addSuccess({
        title: enabled
          ? i18n.translate('xpack.cloudConnect.services.enable.successTitle', {
              defaultMessage: 'Service enabled successfully',
            })
          : i18n.translate('xpack.cloudConnect.services.disable.successTitle', {
              defaultMessage: 'Service disabled successfully',
            }),
      });
    }

    // Track telemetry for service enable/disable
    const service = services[serviceKey as ServiceType];
    const telemetryProps = {
      service_type: serviceKey as ServiceType,
      region_id: service?.config?.region_id,
    };

    if (enabled) {
      telemetryService.trackServiceEnabled(telemetryProps);
    } else {
      telemetryService.trackServiceDisabled(telemetryProps);
    }

    setLoadingService(null);
    // Optimistically update the UI
    onServiceUpdate(serviceKey, enabled);
  };

  // Enables a service directly without confirmation
  const handleEnableService = (serviceKey: ServiceType) => handleServiceUpdate(serviceKey, true);

  // Disables the service currently pending in the modal, then closes the modal
  const handleDisableService = async () => {
    if (!disableModalService) return;
    await handleServiceUpdate(disableModalService.key as ServiceType, false);
    setDisableModalService(null);
  };

  // Opens the disable confirmation modal for a specific service
  const showDisableModal = (serviceKey: ServiceType, serviceName: string) => {
    setDisableModalService({ key: serviceKey, name: serviceName });
  };

  // Closes the disable confirmation modal without taking action
  const closeDisableModal = () => {
    setDisableModalService(null);
  };

  const handleEnableServiceByUrl = (serviceKey: ServiceType, url: string) => {
    // Track telemetry for external link click to enable service
    telemetryService.trackLinkClicked({
      destination_type: 'service_enable_url',
      service_type: serviceKey,
    });

    window.open(url, '_blank');
  };

  const handleRotateServiceApiKey = async (serviceKey: ServiceType) => {
    setLoadingService(serviceKey);

    const { error } = await apiService.rotateServiceApiKey(serviceKey);

    setLoadingService(null);

    if (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.cloudConnect.services.rotateApiKey.errorTitle', {
          defaultMessage: 'Failed to rotate API key',
        }),
        text: error.message,
      });
      return;
    }

    notifications.toasts.addSuccess({
      title: i18n.translate('xpack.cloudConnect.services.rotateApiKey.successTitle', {
        defaultMessage: 'Service API key rotated successfully',
      }),
    });
  };

  return {
    loadingService,
    disableModalService,
    handleEnableService,
    handleDisableService,
    showDisableModal,
    closeDisableModal,
    handleEnableServiceByUrl,
    handleRotateServiceApiKey,
  };
};
