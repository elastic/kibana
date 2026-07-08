/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { KnowledgeIndicatorSource } from '@kbn/significant-events-schema';
import React, { useMemo } from 'react';
import { KnowledgeIndicatorSelectableFilter } from '../knowledge_indicator_selectable_filter';
import { getKnowledgeIndicatorSource } from '../utils/get_knowledge_indicator_source';

interface KnowledgeIndicatorsSourceFilterProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  statusFilter: 'active' | 'excluded';
  selectedSources: string[];
  onSelectedSourcesChange: (selectedSources: string[]) => void;
}

export function KnowledgeIndicatorsSourceFilter({
  knowledgeIndicators,
  searchTerm,
  statusFilter,
  selectedSources,
  onSelectedSourcesChange,
}: KnowledgeIndicatorsSourceFilterProps) {
  const filterCriteria = useMemo(() => ({ statusFilter }), [statusFilter]);

  return (
    <KnowledgeIndicatorSelectableFilter
      knowledgeIndicators={knowledgeIndicators}
      searchTerm={searchTerm}
      getValue={getKnowledgeIndicatorSource}
      selected={selectedSources}
      onSelectedChange={onSelectedSourcesChange}
      filterCriteria={filterCriteria}
      getLabel={getSourceLabel}
      labels={{
        button: i18n.translate(
          'xpack.streams.significantEventsTable.knowledgeIndicatorSourceFilterLabel',
          { defaultMessage: 'Source' }
        ),
        groupLabel: i18n.translate(
          'xpack.streams.significantEventsTable.knowledgeIndicatorSourceFilterGroupLabel',
          { defaultMessage: 'Filter by source' }
        ),
        popoverAriaLabel: i18n.translate(
          'xpack.streams.significantEventsTable.knowledgeIndicatorSourceFilterPopoverLabel',
          { defaultMessage: 'Knowledge indicator source filter' }
        ),
        selectableAriaLabel: i18n.translate(
          'xpack.streams.significantEventsTable.knowledgeIndicatorSourceFilterSelectableAriaLabel',
          { defaultMessage: 'Filter knowledge indicators by source' }
        ),
      }}
    />
  );
}

function getSourceLabel(source: string): string {
  const labels: Record<KnowledgeIndicatorSource, string> = {
    code: i18n.translate('xpack.streams.significantEventsTable.sourceFilter.codeLabel', {
      defaultMessage: 'Code',
    }),
    logs: i18n.translate('xpack.streams.significantEventsTable.sourceFilter.logsLabel', {
      defaultMessage: 'Logs',
    }),
    both: i18n.translate('xpack.streams.significantEventsTable.sourceFilter.bothLabel', {
      defaultMessage: 'Code + Logs',
    }),
  };
  return labels[source as KnowledgeIndicatorSource] ?? source;
}
