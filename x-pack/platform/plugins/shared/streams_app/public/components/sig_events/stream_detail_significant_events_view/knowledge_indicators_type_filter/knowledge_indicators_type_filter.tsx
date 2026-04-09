/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { isComputedFeature } from '@kbn/streams-schema';
import { upperFirst } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';

interface KnowledgeIndicatorTypeFilterProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  statusFilter: 'active' | 'excluded';
  selectedTypes: string[];
  onSelectedTypesChange: (selectedTypes: string[]) => void;
  hideComputedTypes?: boolean;
  selectedStreams?: string[];
}

export function KnowledgeIndicatorsTypeFilter({
  knowledgeIndicators,
  searchTerm,
  statusFilter,
  selectedTypes,
  onSelectedTypesChange,
  hideComputedTypes = false,
  selectedStreams = [],
}: KnowledgeIndicatorTypeFilterProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({
    prefix: 'knowledgeIndicatorTypeFilterPopover',
  });

  const hasActiveFilters = selectedTypes.length > 0;

  const matchesStreamFilter = useCallback(
    (knowledgeIndicator: KnowledgeIndicator) => {
      if (selectedStreams.length === 0) {
        return true;
      }
      const streamName =
        knowledgeIndicator.kind === 'feature'
          ? knowledgeIndicator.feature.stream_name
          : knowledgeIndicator.stream_name;
      return selectedStreams.includes(streamName);
    },
    [selectedStreams]
  );

  const availableTypes = useMemo(() => {
    const types = new Set<string>();

    knowledgeIndicators.forEach((knowledgeIndicator) => {
      if (
        hideComputedTypes &&
        knowledgeIndicator.kind === 'feature' &&
        isComputedFeature(knowledgeIndicator.feature)
      ) {
        return;
      }
      if (!matchesStreamFilter(knowledgeIndicator)) {
        return;
      }
      if (knowledgeIndicator.kind === 'feature') {
        types.add(knowledgeIndicator.feature.type);
      } else {
        types.add('query');
      }
    });

    return Array.from(types).sort((left, right) => left.localeCompare(right));
  }, [knowledgeIndicators, hideComputedTypes, matchesStreamFilter]);

  const typeCounts = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const counts: Record<string, number> = {};

    knowledgeIndicators.forEach((knowledgeIndicator) => {
      if (
        hideComputedTypes &&
        knowledgeIndicator.kind === 'feature' &&
        isComputedFeature(knowledgeIndicator.feature)
      ) {
        return;
      }

      if (!matchesStreamFilter(knowledgeIndicator)) {
        return;
      }

      const matchesStatusFilter =
        statusFilter === 'active'
          ? knowledgeIndicator.kind === 'query' || !knowledgeIndicator.feature.excluded_at
          : knowledgeIndicator.kind === 'feature' &&
            Boolean(knowledgeIndicator.feature.excluded_at);

      if (!matchesStatusFilter) {
        return;
      }

      const type =
        knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature.type : 'query';

      const title =
        knowledgeIndicator.kind === 'feature'
          ? (knowledgeIndicator.feature.title ?? '').toLowerCase()
          : (knowledgeIndicator.query.title ?? '').toLowerCase();

      if (!normalizedSearchTerm || title.includes(normalizedSearchTerm)) {
        counts[type] = (counts[type] ?? 0) + 1;
      }
    });

    return counts;
  }, [knowledgeIndicators, searchTerm, statusFilter, hideComputedTypes, matchesStreamFilter]);

  const options = useMemo<EuiSelectableOption[]>(
    () => [
      {
        label: KNOWLEDGE_INDICATOR_TYPE_FILTER_GROUP_LABEL,
        isGroupLabel: true,
      },
      ...availableTypes.map((type) => ({
        key: type,
        checked: selectedTypes.includes(type) ? ('on' as const) : undefined,
        label: type === 'query' ? KNOWLEDGE_INDICATOR_QUERY_TYPE_LABEL : upperFirst(type),
        append: <EuiBadge>{typeCounts[type] ?? 0}</EuiBadge>,
      })),
    ],
    [availableTypes, selectedTypes, typeCounts]
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        id={popoverId}
        aria-label={KNOWLEDGE_INDICATOR_TYPE_FILTER_POPOVER_ARIA_LABEL}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            isSelected={isPopoverOpen}
            hasActiveFilters={hasActiveFilters}
            numFilters={availableTypes.length}
            numActiveFilters={selectedTypes.length}
            onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          >
            {KNOWLEDGE_INDICATOR_TYPE_FILTER_LABEL}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={KNOWLEDGE_INDICATOR_TYPE_FILTER_SELECTABLE_ARIA_LABEL}
          options={options}
          onChange={(nextOptions) => {
            onSelectedTypesChange(
              nextOptions
                .filter((option) => option.checked === 'on')
                .map((option) => String(option.key ?? option.label))
            );
          }}
        >
          {(list) => (
            <div
              css={css`
                min-width: 260px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}

const KNOWLEDGE_INDICATOR_TYPE_FILTER_GROUP_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterGroupLabel',
  {
    defaultMessage: 'Filter by field type',
  }
);

const KNOWLEDGE_INDICATOR_QUERY_TYPE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorType.query',
  {
    defaultMessage: 'Query',
  }
);

const KNOWLEDGE_INDICATOR_TYPE_FILTER_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterPopoverLabel',
  {
    defaultMessage: 'Knowledge indicator type filter',
  }
);

const KNOWLEDGE_INDICATOR_TYPE_FILTER_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterLabel',
  {
    defaultMessage: 'Type',
  }
);

const KNOWLEDGE_INDICATOR_TYPE_FILTER_SELECTABLE_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterSelectableAriaLabel',
  {
    defaultMessage: 'Filter knowledge indicators by type',
  }
);
