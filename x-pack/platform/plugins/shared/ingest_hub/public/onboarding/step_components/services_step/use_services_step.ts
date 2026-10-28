/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import type { AwsServiceMatrixEntry, SignalType } from '../../aws_service_matrix';
import { isAgentBasedOnly } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';

export type SignalFilter = SignalType | 'all';

export function useServicesStep({ onContinue }: { onContinue: () => void }) {
  const {
    servicesStep,
    setSelectedServiceIds,
    setDataFormat,
    awsServiceMatrix: rawMatrix,
    deploymentMethod,
  } = useOnboardingFlow();
  const { selectedServiceIds, dataFormat } = servicesStep;

  const awsServiceMatrix = useMemo(() => rawMatrix ?? [], [rawMatrix]);

  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // One flat list, ordered by name so services with several variants (logs / metrics) sit together.
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return awsServiceMatrix
      .filter(
        (s) =>
          s.showInUI &&
          (s.dataFormat ?? 'ecs') === dataFormat &&
          (signalFilter === 'all' || s.signalTypes.includes(signalFilter)) &&
          (q === '' || s.name.toLowerCase().includes(q))
      )
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }, [awsServiceMatrix, signalFilter, searchQuery, dataFormat]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of filteredServices) {
      counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name));
  }, [filteredServices]);

  const selectedSet = useMemo(() => new Set(selectedServiceIds), [selectedServiceIds]);

  const agentBasedOnlySelected = useMemo(
    () => awsServiceMatrix?.filter((s) => selectedSet.has(s.id) && isAgentBasedOnly(s)) ?? [],
    [awsServiceMatrix, selectedSet]
  );

  const ecfOnlySelected = useMemo(
    () => awsServiceMatrix.filter((s) => selectedSet.has(s.id) && s.ecfOnly),
    [awsServiceMatrix, selectedSet]
  );

  const isReady = selectedServiceIds.length > 0;

  const handleToggle = useCallback(
    (serviceId: string, checked: boolean) => {
      const next = checked
        ? [...new Set([...selectedServiceIds, serviceId])]
        : selectedServiceIds.filter((id) => id !== serviceId);
      setSelectedServiceIds(next);
    },
    [selectedServiceIds, setSelectedServiceIds]
  );

  // Agent-based cannot deploy ECF-only services, so they cannot be selected while it is the method.
  const isUnavailableForMethod = useCallback(
    (service: AwsServiceMatrixEntry) =>
      deploymentMethod === 'agent_based' && service.ecfOnly === true,
    [deploymentMethod]
  );

  const selectableServices = useMemo(
    () => filteredServices.filter((s) => !isUnavailableForMethod(s)),
    [filteredServices, isUnavailableForMethod]
  );

  const allVisibleSelected = useMemo(
    () => selectableServices.length > 0 && selectableServices.every((s) => selectedSet.has(s.id)),
    [selectableServices, selectedSet]
  );

  const handleSelectAllVisible = useCallback(() => {
    const ids = selectableServices.map((s) => s.id);
    setSelectedServiceIds([...new Set([...selectedServiceIds, ...ids])]);
  }, [selectableServices, selectedServiceIds, setSelectedServiceIds]);

  const handleDeselectAllVisible = useCallback(() => {
    const ids = new Set(filteredServices.map((s) => s.id));
    setSelectedServiceIds(selectedServiceIds.filter((id) => !ids.has(id)));
  }, [filteredServices, selectedServiceIds, setSelectedServiceIds]);

  const handleNext = useCallback(() => {
    if (!isReady) return;
    onContinue();
  }, [isReady, onContinue]);

  return {
    signalFilter,
    setSignalFilter,
    searchQuery,
    setSearchQuery,
    filteredServices,
    duplicateNames,
    selectedSet,
    isReady,
    handleToggle,
    allVisibleSelected,
    handleSelectAllVisible,
    handleDeselectAllVisible,
    handleNext,
    dataFormat,
    setDataFormat,
    agentBasedOnlySelected,
    ecfOnlySelected,
    isUnavailableForMethod,
  };
}
