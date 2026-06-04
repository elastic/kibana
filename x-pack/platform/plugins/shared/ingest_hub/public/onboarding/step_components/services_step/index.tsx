/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AWS_SERVICES_MATRIX } from '../../aws_service_matrix';
import type { ServiceCategory, SignalType } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { ServiceRow } from './service_row';

interface ServicesStepProps {
  onNext: () => void;
}

type SignalFilter = SignalType | 'all';

const SIGNAL_FILTER_OPTIONS = [
  {
    id: 'all' as SignalFilter,
    label: i18n.translate('xpack.ingestHub.servicesStep.filter.all', { defaultMessage: 'All' }),
  },
  {
    id: 'logs' as SignalFilter,
    label: i18n.translate('xpack.ingestHub.servicesStep.filter.logs', { defaultMessage: 'Logs' }),
  },
  {
    id: 'metrics' as SignalFilter,
    label: i18n.translate('xpack.ingestHub.servicesStep.filter.metrics', {
      defaultMessage: 'Metrics',
    }),
  },
];

const CATEGORY_ORDER: ServiceCategory[] = [
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

function categoryColor(category: string): string {
  const index = CATEGORY_ORDER.indexOf(category as ServiceCategory);
  const hue = Math.round((Math.max(0, index) * 137.508) % 360);
  return `hsl(${hue}, 60%, 42%)`;
}

export function ServicesStep({ onNext }: ServicesStepProps) {
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

  useEffect(() => {
    if (!selectedCategory || !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0] ?? null);
    }
  }, [categories, selectedCategory]);

  const activeCategory = selectedCategory ?? categories[0] ?? null;

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
    onNext();
  }, [isReady, onNext]);

  return (
    <div data-test-subj="onboardingStep-services">
      <EuiTitle size="l">
        <h2>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.title"
            defaultMessage="Which AWS services do you want to monitor?"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.subtitle"
            defaultMessage="Select the services you use. Elastic will set up everything needed to start collecting data from your AWS account."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            compressed
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={i18n.translate('xpack.ingestHub.servicesStep.searchPlaceholder', {
              defaultMessage: 'Search services',
            })}
            data-test-subj="servicesStep-searchBox"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.ingestHub.servicesStep.filter.legend', {
              defaultMessage: 'Filter by signal type',
            })}
            options={SIGNAL_FILTER_OPTIONS}
            idSelected={signalFilter}
            onChange={(id) => setSignalFilter(id as SignalFilter)}
            buttonSize="compressed"
            data-test-subj="servicesStep-signalFilter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false} style={{ width: 240 }}>
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            const catServices = filteredServices.filter((s) => s.category === cat);
            const catSelectedCount = catServices.filter((s) => selectedSet.has(s.id)).length;
            const uniqueNames = [...new Set(catServices.map((s) => s.name))];
            const preview =
              uniqueNames.slice(0, 2).join(', ') + (uniqueNames.length > 2 ? ', ...' : '');

            return (
              <EuiPanel
                key={cat}
                paddingSize="s"
                hasBorder={false}
                hasShadow={false}
                color={isActive ? 'subdued' : 'transparent'}
                onClick={() => setSelectedCategory(cat)}
                style={{ cursor: 'pointer' }}
                data-test-subj={`servicesStep-category-${cat}`}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <EuiHealth color={categoryColor(cat)} textSize="s">
                      {cat}
                    </EuiHealth>
                    <EuiText size="xs" color="subdued" style={{ paddingLeft: 20 }}>
                      {preview}
                    </EuiText>
                  </EuiFlexItem>
                  {catSelectedCount > 0 && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{catSelectedCount}</EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiPanel>
            );
          })}
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m" hasBorder>
            {activeCategory ? (
              <>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>{activeCategory}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {allInCategorySelected ? (
                      <EuiButtonEmpty
                        size="s"
                        onClick={handleDeselectAllInCategory}
                        data-test-subj="servicesStep-deselectAllButton"
                      >
                        <FormattedMessage
                          id="xpack.ingestHub.servicesStep.deselectAll"
                          defaultMessage="Deselect all"
                        />
                      </EuiButtonEmpty>
                    ) : (
                      <EuiButtonEmpty
                        size="s"
                        onClick={handleSelectAllInCategory}
                        data-test-subj="servicesStep-selectAllButton"
                      >
                        <FormattedMessage
                          id="xpack.ingestHub.servicesStep.selectAll"
                          defaultMessage="Select all"
                        />
                      </EuiButtonEmpty>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiFlexGrid columns={2} gutterSize="s">
                  {servicesInCategory.map((service) => (
                    <EuiFlexItem key={service.id}>
                      <ServiceRow
                        service={service}
                        isSelected={selectedSet.has(service.id)}
                        onToggle={handleToggle}
                        displayName={
                          duplicateNamesInCategory.has(service.name)
                            ? `${service.name} ${
                                service.signalType === 'logs' ? 'Logs' : 'Metrics'
                              }`
                            : undefined
                        }
                      />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGrid>
              </>
            ) : null}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleNext}
            isDisabled={!isReady}
            data-test-subj="servicesStep-nextButton"
          >
            <FormattedMessage id="xpack.ingestHub.servicesStep.nextButton" defaultMessage="Next" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
