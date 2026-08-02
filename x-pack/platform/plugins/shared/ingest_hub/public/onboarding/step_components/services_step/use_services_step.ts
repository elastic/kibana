/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import { AWS_SERVICES_MATRIX } from '../../aws_service_matrix';
import type { ServiceCategory, SignalType } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';

export type SignalFilter = SignalType | 'all';

export const CATEGORY_ORDER: ServiceCategory[] = [
  'Security, Identity and Compliance',
  'Compute',
  'Networking and Content Delivery',
  'Storage',
  'Databases',
  'Analytics',
  'Cloud Financial Management',
  'Management and Governance',
  'Application Integration',
  'Machine Learning',
  'Containers',
];

export function useServicesStep({ onContinue }: { onContinue: () => void }) {
  const { servicesStep, setSelectedServiceIds } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AWS_SERVICES_MATRIX.filter(
      (s) =>
        s.showInUI &&
        (signalFilter === 'all' || s.signalType === signalFilter) &&
        (q === '' || s.name.toLowerCase().includes(q))
    );
  }, [signalFilter, searchQuery]);

  const categories = useMemo(() => {
    const present = new Set(filteredServices.map((s) => s.category));
    return CATEGORY_ORDER.filter((cat) => present.has(cat));
  }, [filteredServices]);

  // Derive the active category without a useEffect: if the selected category has been
  // filtered out, fall back to the first available category.
  const activeCategory =
    selectedCategory && categories.includes(selectedCategory)
      ? selectedCategory
      : categories[0] ?? null;

  const servicesInCategory = useMemo(
    () => filteredServices.filter((s) => s.category === activeCategory),
    [filteredServices, activeCategory]
  );

  const duplicateNamesInCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of servicesInCategory) {
      counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name));
  }, [servicesInCategory]);

  const selectedSet = useMemo(() => new Set(selectedServiceIds), [selectedServiceIds]);

  // Signal-filtered but search-independent set: matches what "Select all" operates on,
  // so total/selected in the badge stay reachable under the active signal filter.
  const signalFilteredServices = useMemo(
    () =>
      AWS_SERVICES_MATRIX.filter(
        (s) => s.showInUI && (signalFilter === 'all' || s.signalType === signalFilter)
      ),
    [signalFilter]
  );

  const categoryStats = useMemo(() => {
    const stats = new Map<ServiceCategory, { total: number; selected: number; preview: string }>();
    for (const cat of categories) {
      const catServices = signalFilteredServices.filter((s) => s.category === cat);
      const total = catServices.length;
      const selected = catServices.filter((s) => selectedSet.has(s.id)).length;
      const uniqueNames = [...new Set(catServices.map((s) => s.name))];
      const preview = uniqueNames.slice(0, 2).join(', ') + (uniqueNames.length > 2 ? ', ...' : '');
      stats.set(cat, { total, selected, preview });
    }
    return stats;
  }, [categories, signalFilteredServices, selectedSet]);

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

  const allInCategorySelected = useMemo(
    () => servicesInCategory.length > 0 && servicesInCategory.every((s) => selectedSet.has(s.id)),
    [servicesInCategory, selectedSet]
  );

  const handleSelectAllInCategory = useCallback(() => {
    const ids = servicesInCategory.map((s) => s.id);
    setSelectedServiceIds([...new Set([...selectedServiceIds, ...ids])]);
  }, [servicesInCategory, selectedServiceIds, setSelectedServiceIds]);

  const handleDeselectAllInCategory = useCallback(() => {
    const ids = new Set(servicesInCategory.map((s) => s.id));
    setSelectedServiceIds(selectedServiceIds.filter((id) => !ids.has(id)));
  }, [servicesInCategory, selectedServiceIds, setSelectedServiceIds]);

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
    categories,
    activeCategory,
    setSelectedCategory,
    servicesInCategory,
    duplicateNamesInCategory,
    selectedSet,
    categoryStats,
    isReady,
    handleToggle,
    allInCategorySelected,
    handleSelectAllInCategory,
    handleDeselectAllInCategory,
    handleNext,
  };
}
