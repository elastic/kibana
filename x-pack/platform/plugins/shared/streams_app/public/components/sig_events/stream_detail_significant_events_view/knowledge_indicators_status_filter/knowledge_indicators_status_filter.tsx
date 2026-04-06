/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useMemo } from 'react';

interface KnowledgeIndicatorStatusFilterProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  selectedTypes: string[];
  statusFilter: 'active' | 'excluded';
  onStatusFilterChange: (filter: 'active' | 'excluded') => void;
}

export function KnowledgeIndicatorsStatusFilter({
  knowledgeIndicators,
  searchTerm,
  selectedTypes,
  statusFilter,
  onStatusFilterChange,
}: KnowledgeIndicatorStatusFilterProps) {
  const statusFilterCounts = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return knowledgeIndicators.reduce(
      (accumulator, knowledgeIndicator) => {
        const type =
          knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature.type : 'query';
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(type);

        if (!matchesType) {
          return accumulator;
        }

        const title =
          knowledgeIndicator.kind === 'feature'
            ? (knowledgeIndicator.feature.title ?? '').toLowerCase()
            : (knowledgeIndicator.query.title ?? '').toLowerCase();

        if (normalizedSearchTerm && !title.includes(normalizedSearchTerm)) {
          return accumulator;
        }

        if (knowledgeIndicator.kind === 'feature' && knowledgeIndicator.feature.excluded_at) {
          accumulator.excluded += 1;
        } else {
          accumulator.active += 1;
        }

        return accumulator;
      },
      { active: 0, excluded: 0 }
    );
  }, [knowledgeIndicators, searchTerm, selectedTypes]);

  return (
    <EuiFilterGroup>
      <EuiFilterButton
        numFilters={statusFilterCounts.active}
        numActiveFilters={statusFilter === 'active' ? statusFilterCounts.active : 0}
        hasActiveFilters={statusFilter === 'active'}
        isSelected={statusFilter === 'active'}
        onClick={() => onStatusFilterChange('active')}
      >
        {KNOWLEDGE_INDICATOR_STATUS_FILTER_ACTIVE_LABEL}
      </EuiFilterButton>
      <EuiFilterButton
        numFilters={statusFilterCounts.excluded}
        numActiveFilters={statusFilter === 'excluded' ? statusFilterCounts.excluded : 0}
        hasActiveFilters={statusFilter === 'excluded'}
        isSelected={statusFilter === 'excluded'}
        onClick={() => onStatusFilterChange('excluded')}
      >
        {KNOWLEDGE_INDICATOR_STATUS_FILTER_EXCLUDED_LABEL}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
}

const KNOWLEDGE_INDICATOR_STATUS_FILTER_ACTIVE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorStatusFilterActiveLabel',
  {
    defaultMessage: 'Active',
  }
);

const KNOWLEDGE_INDICATOR_STATUS_FILTER_EXCLUDED_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorStatusFilterExcludedLabel',
  {
    defaultMessage: 'Excluded',
  }
);
