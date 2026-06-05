/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { AWS_SERVICES_MAP } from '../../aws_service_matrix';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { getDefaultTransport, getInlineFields, FIELD_CONFIG } from './field_config';
import type { TransportType } from './field_config';

export interface ServiceConfig {
  activeTransport: TransportType | null;
  fields: Record<string, string>;
}

interface PersistedState {
  globalRegion: string;
  configs: Record<string, ServiceConfig>;
}

const SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

export function useServiceSettings({ onNext }: { onNext: () => void }) {
  const { servicesStep } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [persisted, setPersisted] = useSessionStorage<PersistedState>(SESSION_KEY, {
    globalRegion: '',
    configs: {},
  });

  const [showValidation, setShowValidation] = useState(false);

  const globalRegion = persisted?.globalRegion ?? '';

  const setGlobalRegion = useCallback(
    (region: string) => {
      setPersisted({ ...(persisted ?? { globalRegion: '', configs: {} }), globalRegion: region });
    },
    [persisted, setPersisted]
  );

  const selectedServices: AwsServiceMatrixEntry[] = useMemo(
    () =>
      selectedServiceIds
        .map((id) => AWS_SERVICES_MAP.get(id))
        .filter((s): s is AwsServiceMatrixEntry => s !== undefined),
    [selectedServiceIds]
  );

  const getServiceConfig = useCallback(
    (serviceId: string): ServiceConfig => {
      const existing = persisted?.configs?.[serviceId];
      if (existing) return existing;
      const service = AWS_SERVICES_MAP.get(serviceId);
      return {
        activeTransport: service ? getDefaultTransport(service) : null,
        fields: {},
      };
    },
    [persisted]
  );

  const setServiceTransport = useCallback(
    (serviceId: string, transport: TransportType) => {
      const current = getServiceConfig(serviceId);
      const updated: ServiceConfig = { ...current, activeTransport: transport };
      setPersisted({
        ...(persisted ?? { globalRegion: '', configs: {} }),
        configs: {
          ...(persisted?.configs ?? {}),
          [serviceId]: updated,
        },
      });
    },
    [persisted, setPersisted, getServiceConfig]
  );

  const setServiceField = useCallback(
    (serviceId: string, fieldName: string, value: string) => {
      const current = getServiceConfig(serviceId);
      const updated: ServiceConfig = {
        ...current,
        fields: { ...current.fields, [fieldName]: value },
      };
      setPersisted({
        ...(persisted ?? { globalRegion: '', configs: {} }),
        configs: {
          ...(persisted?.configs ?? {}),
          [serviceId]: updated,
        },
      });
    },
    [persisted, setPersisted, getServiceConfig]
  );

  const isReady = useMemo(() => {
    return selectedServices.every((service) => {
      const config = getServiceConfig(service.id);
      const inlineFields = getInlineFields(service, config.activeTransport);
      return inlineFields.every((f) => {
        const meta = FIELD_CONFIG[f];
        if (!meta) return true;
        return (config.fields[f] ?? '').trim() !== '';
      });
    });
  }, [selectedServices, getServiceConfig]);

  const handleNext = useCallback(() => {
    if (!isReady) {
      setShowValidation(true);
      return;
    }
    onNext();
  }, [isReady, onNext]);

  return {
    globalRegion,
    setGlobalRegion,
    selectedServices,
    getServiceConfig,
    setServiceTransport,
    setServiceField,
    isReady,
    handleNext,
    showValidation,
    setShowValidation,
  };
}
