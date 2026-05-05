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
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { upperFirst } from 'lodash';
import React, { useMemo, useState } from 'react';
import { matchesKnowledgeIndicatorFilters } from '../utils/matches_knowledge_indicator_filters';
import { getKnowledgeIndicatorSubtype } from '../utils/get_knowledge_indicator_subtype';

interface KnowledgeIndicatorsSubtypeFilterProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  statusFilter: 'active' | 'excluded';
  selectedTypes: string[];
  selectedSubtypes: string[];
  onSelectedSubtypesChange: (subtypes: string[]) => void;
  hideComputedTypes?: boolean;
  selectedStreams?: string[];
}

export function KnowledgeIndicatorsSubtypeFilter({
  knowledgeIndicators,
  searchTerm,
  statusFilter,
  selectedTypes,
  selectedSubtypes,
  onSelectedSubtypesChange,
  hideComputedTypes = false,
  selectedStreams = [],
}: KnowledgeIndicatorsSubtypeFilterProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({
    prefix: 'knowledgeIndicatorSubtypeFilterPopover',
  });

  const hasActiveFilters = selectedSubtypes.length > 0;

  const availableSubtypes = useMemo(() => {
    const subtypes = new Set<string>();

    knowledgeIndicators.forEach((ki) => {
      if (
        !matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedTypes,
          selectedStreams,
          hideComputedTypes,
        })
      ) {
        return;
      }
      const subtype = getKnowledgeIndicatorSubtype(ki);
      if (subtype) subtypes.add(subtype);
    });

    return Array.from(subtypes).sort((a, b) => a.localeCompare(b));
  }, [knowledgeIndicators, statusFilter, selectedTypes, hideComputedTypes, selectedStreams]);

  const subtypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    knowledgeIndicators.forEach((ki) => {
      if (
        !matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedTypes,
          selectedStreams,
          hideComputedTypes,
          searchTerm,
        })
      ) {
        return;
      }
      const subtype = getKnowledgeIndicatorSubtype(ki);
      if (subtype) counts[subtype] = (counts[subtype] ?? 0) + 1;
    });

    return counts;
  }, [
    knowledgeIndicators,
    searchTerm,
    statusFilter,
    selectedTypes,
    hideComputedTypes,
    selectedStreams,
  ]);

  const options = useMemo<EuiSelectableOption[]>(
    () => [
      {
        label: SUBTYPE_FILTER_GROUP_LABEL,
        isGroupLabel: true,
      },
      ...availableSubtypes.map((subtype) => ({
        key: subtype,
        checked: selectedSubtypes.includes(subtype) ? ('on' as const) : undefined,
        label: upperFirst(subtype),
        append: <EuiBadge>{subtypeCounts[subtype] ?? 0}</EuiBadge>,
      })),
    ],
    [availableSubtypes, selectedSubtypes, subtypeCounts]
  );

  if (availableSubtypes.length === 0) return null;

  return (
    <EuiFilterGroup>
      <EuiPopover
        id={popoverId}
        aria-label={SUBTYPE_FILTER_POPOVER_ARIA_LABEL}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            isSelected={isPopoverOpen}
            hasActiveFilters={hasActiveFilters}
            numFilters={availableSubtypes.length}
            numActiveFilters={selectedSubtypes.length}
            onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          >
            {SUBTYPE_FILTER_LABEL}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={SUBTYPE_FILTER_SELECTABLE_ARIA_LABEL}
          options={options}
          onChange={(nextOptions) => {
            onSelectedSubtypesChange(
              nextOptions
                .filter((option) => option.checked === 'on')
                .map((option) => String(option.key ?? option.label))
            );
          }}
        >
          {(list) => (
            <EuiPanel
              hasShadow={false}
              hasBorder={false}
              paddingSize="none"
              css={css`
                min-width: 260px;
              `}
            >
              {list}
            </EuiPanel>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}

const SUBTYPE_FILTER_GROUP_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorSubtypeFilterGroupLabel',
  {
    defaultMessage: 'Filter by subtype',
  }
);

const SUBTYPE_FILTER_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorSubtypeFilterPopoverLabel',
  {
    defaultMessage: 'Knowledge indicator subtype filter',
  }
);

const SUBTYPE_FILTER_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorSubtypeFilterLabel',
  {
    defaultMessage: 'Subtype',
  }
);

const SUBTYPE_FILTER_SELECTABLE_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorSubtypeFilterSelectableAriaLabel',
  {
    defaultMessage: 'Filter knowledge indicators by subtype',
  }
);
