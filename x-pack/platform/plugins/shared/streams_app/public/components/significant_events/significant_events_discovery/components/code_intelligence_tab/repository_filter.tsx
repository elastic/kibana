/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useMemo } from 'react';
import { KnowledgeIndicatorSelectableFilter } from '../../../stream_detail_significant_events_view/knowledge_indicator_selectable_filter';
import { getKnowledgeIndicatorRepository } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_repository';
import type { KnowledgeIndicatorFilterCriteria } from '../../../stream_detail_significant_events_view/utils/matches_knowledge_indicator_filters';

interface RepositoryFilterProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  filterCriteria: KnowledgeIndicatorFilterCriteria;
  selectedRepositories: string[];
  onSelectedRepositoriesChange: (selectedRepositories: string[]) => void;
}

/** Filters code KIs by their source repository (analogue of the stream filter). */
export function RepositoryFilter({
  knowledgeIndicators,
  searchTerm,
  filterCriteria,
  selectedRepositories,
  onSelectedRepositoriesChange,
}: RepositoryFilterProps) {
  const criteria = useMemo(() => filterCriteria, [filterCriteria]);

  return (
    <KnowledgeIndicatorSelectableFilter
      knowledgeIndicators={knowledgeIndicators}
      searchTerm={searchTerm}
      getValue={getKnowledgeIndicatorRepository}
      selected={selectedRepositories}
      onSelectedChange={onSelectedRepositoriesChange}
      labels={{
        button: i18n.translate('xpack.streams.codeIntelligence.repositoryFilterLabel', {
          defaultMessage: 'Repository',
        }),
        groupLabel: i18n.translate('xpack.streams.codeIntelligence.repositoryFilterGroupLabel', {
          defaultMessage: 'Filter by repository',
        }),
        popoverAriaLabel: i18n.translate(
          'xpack.streams.codeIntelligence.repositoryFilterPopoverLabel',
          { defaultMessage: 'Repository filter' }
        ),
        selectableAriaLabel: i18n.translate(
          'xpack.streams.codeIntelligence.repositoryFilterSelectableAriaLabel',
          { defaultMessage: 'Filter knowledge indicators by repository' }
        ),
      }}
      filterCriteria={criteria}
    />
  );
}
