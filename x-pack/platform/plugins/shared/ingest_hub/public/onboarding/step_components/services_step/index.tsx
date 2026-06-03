/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AWS_SERVICES_MATRIX } from '../../aws_service_matrix';
import type { AwsServiceMatrixEntry, SignalType } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { ServiceRow } from './service_row';
import type { ServiceGroupData } from './service_row';

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

/** Groups an array of matrix entries by policyTemplate (falling back to id). */
function buildServiceGroups(entries: AwsServiceMatrixEntry[]): ServiceGroupData[] {
  const groupMap = new Map<
    string,
    {
      name: string;
      signalTypes: Set<SignalType>;
      entryIds: string[];
    }
  >();

  for (const entry of entries) {
    const key = entry.policyTemplate ?? entry.id;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        name: entry.name,
        signalTypes: new Set([entry.signalType]),
        entryIds: [entry.id],
      });
    } else {
      const group = groupMap.get(key)!;
      group.signalTypes.add(entry.signalType);
      group.entryIds.push(entry.id);
    }
  }

  return Array.from(groupMap.entries()).map(([key, g]) => ({
    key,
    name: g.name,
    signalTypes: Array.from(g.signalTypes),
    entryIds: g.entryIds,
  }));
}

// All visible groups computed once from the static matrix.
const ALL_GROUPS = buildServiceGroups(AWS_SERVICES_MATRIX.filter((s) => s.showInUI));

export function ServicesStep({ onNext }: ServicesStepProps) {
  const { servicesStep, setSelectedServiceIds } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AWS_SERVICES_MATRIX.filter(
      (s) =>
        s.showInUI &&
        (signalFilter === 'all' || s.signalType === signalFilter) &&
        (q === '' || s.name.toLowerCase().includes(q))
    );
  }, [signalFilter, searchQuery]);

  // Groups derived from currently visible (filtered) entries.
  const serviceGroups = useMemo(() => buildServiceGroups(filteredEntries), [filteredEntries]);

  const selectedSet = useMemo(() => new Set(selectedServiceIds), [selectedServiceIds]);

  // A group is selected when all of its entries are in the selection.
  const isGroupSelected = useCallback(
    (group: ServiceGroupData) => group.entryIds.every((id) => selectedSet.has(id)),
    [selectedSet]
  );

  // Count of fully-selected groups across all visible entries (independent of current filter).
  const selectedGroupCount = useMemo(
    () => ALL_GROUPS.filter((g) => g.entryIds.every((id) => selectedSet.has(id))).length,
    [selectedSet]
  );

  const isReady = selectedServiceIds.length > 0;

  const handleGroupToggle = useCallback(
    (key: string, checked: boolean) => {
      const group = serviceGroups.find((g) => g.key === key);
      if (!group) return;
      if (checked) {
        setSelectedServiceIds([...new Set([...selectedServiceIds, ...group.entryIds])]);
      } else {
        const toRemove = new Set(group.entryIds);
        setSelectedServiceIds(selectedServiceIds.filter((id) => !toRemove.has(id)));
      }
    },
    [serviceGroups, selectedServiceIds, setSelectedServiceIds]
  );

  const handleSelectAll = useCallback(() => {
    const allVisibleIds = new Set(serviceGroups.flatMap((g) => g.entryIds));
    const existing = selectedServiceIds.filter((id) => !allVisibleIds.has(id));
    setSelectedServiceIds([...existing, ...allVisibleIds]);
  }, [serviceGroups, selectedServiceIds, setSelectedServiceIds]);

  const handleDeselectAll = useCallback(() => {
    const allVisibleIds = new Set(serviceGroups.flatMap((g) => g.entryIds));
    setSelectedServiceIds(selectedServiceIds.filter((id) => !allVisibleIds.has(id)));
  }, [serviceGroups, selectedServiceIds, setSelectedServiceIds]);

  const handleNext = useCallback(() => {
    if (!isReady) return;
    onNext();
  }, [isReady, onNext]);

  return (
    <div data-test-subj="onboardingStep-services">
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

      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.selectedCount"
              defaultMessage="{count} {count, plural, one {service} other {services}} selected"
              values={{ count: selectedGroupCount }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={handleSelectAll}
                data-test-subj="servicesStep-selectAllButton"
              >
                <FormattedMessage
                  id="xpack.ingestHub.servicesStep.selectAll"
                  defaultMessage="Select all"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={handleDeselectAll}
                data-test-subj="servicesStep-deselectAllButton"
              >
                <FormattedMessage
                  id="xpack.ingestHub.servicesStep.deselectAll"
                  defaultMessage="Deselect all"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGrid columns={2} gutterSize="s">
        {serviceGroups.map((group) => (
          <EuiFlexItem key={group.key}>
            <ServiceRow
              group={group}
              isSelected={isGroupSelected(group)}
              onToggle={handleGroupToggle}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>

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
