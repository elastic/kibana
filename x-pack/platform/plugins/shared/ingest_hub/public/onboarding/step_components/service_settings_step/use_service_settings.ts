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
import { getDefaultTransport, getRequiredTextFields } from './field_config';
import type { TransportType } from './field_config';
import type { SignalFilter } from '../services_step/use_services_step';

export interface ServiceVars {
  trigger: TransportType | null;
  vars: Record<string, string>;
}

interface PersistedState {
  globalRegion: string;
  serviceVars: Record<string, ServiceVars>;
}

export const SERVICE_SETTINGS_SESSION_KEY = 'onboarding.aws.serviceSettingsStep';

export function useServiceSettings({ onContinue }: { onContinue: () => void }) {
  const { servicesStep } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [persisted, setPersisted] = useSessionStorage<PersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    {
      globalRegion: '',
      serviceVars: {},
    }
  );

  const globalRegion = persisted?.globalRegion ?? '';

  const setGlobalRegion = useCallback(
    (region: string) => {
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        globalRegion: region,
      });
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

  const getServiceVars = useCallback(
    (serviceId: string): ServiceVars => {
      const existing = persisted?.serviceVars?.[serviceId];
      if (existing) return existing;
      const service = AWS_SERVICES_MAP.get(serviceId);
      return {
        trigger: service ? getDefaultTransport(service) : null,
        vars: {},
      };
    },
    [persisted]
  );

  // Applies multiple field changes (and optional transport) in a single write to avoid
  // stale-closure overwrites when several vars are committed at once (flyout Save).
  const setServiceFieldsAndTransport = useCallback(
    (serviceId: string, newFields: Record<string, string>, transport: TransportType | null) => {
      const current = getServiceVars(serviceId);
      setPersisted({
        ...(persisted ?? { globalRegion: '', serviceVars: {} }),
        serviceVars: {
          ...(persisted?.serviceVars ?? {}),
          [serviceId]: {
            trigger: transport ?? current.trigger,
            vars: { ...current.vars, ...newFields },
          },
        },
      });
    },
    [persisted, setPersisted, getServiceVars]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return selectedServices.filter(
      (s) =>
        (signalFilter === 'all' || s.signalType === signalFilter) &&
        (q === '' || s.name.toLowerCase().includes(q))
    );
  }, [selectedServices, searchQuery, signalFilter]);

  const incompleteServices = useMemo(
    () =>
      selectedServices.filter((service) => {
        const config = getServiceVars(service.id);
        const required = getRequiredTextFields(service, config.trigger);
        return required.some((f) => (config.vars[f] ?? '').trim() === '');
      }),
    [selectedServices, getServiceVars]
  );

  const incompleteServiceIds = useMemo(
    () => new Set(incompleteServices.map((s) => s.id)),
    [incompleteServices]
  );

  const isReady = useMemo(
    () => !!globalRegion.trim() && incompleteServices.length === 0,
    [globalRegion, incompleteServices]
  );

  const [globalRegionTouched, setGlobalRegionTouched] = useState(false);

  const handleNext = useCallback(() => {
    onContinue();
  }, [onContinue]);

  return {
    globalRegion,
    setGlobalRegion,
    selectedServices,
    filteredServices,
    incompleteServices,
    incompleteServiceIds,
    searchQuery,
    setSearchQuery,
    signalFilter,
    setSignalFilter,
    getServiceVars,
    setServiceFieldsAndTransport,
    globalRegionTouched,
    setGlobalRegionTouched,
    isReady,
    handleNext,
  };
}
