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
import React, { useMemo } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { getKnowledgeIndicatorStreamName } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_stream_name';
import { matchesKnowledgeIndicatorFilters } from '../../../stream_detail_significant_events_view/utils/matches_knowledge_indicator_filters';

const popoverPanelStyle = css`
  min-width: 260px;
`;

interface StreamFilterProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  statusFilter: 'active' | 'excluded';
  selectedTypes: string[];
  hideComputedTypes: boolean;
  selectedStreams: string[];
  onSelectedStreamsChange: (selectedStreams: string[]) => void;
}

export function StreamFilter({
  knowledgeIndicators,
  searchTerm,
  statusFilter,
  selectedTypes,
  hideComputedTypes,
  selectedStreams,
  onSelectedStreamsChange,
}: StreamFilterProps) {
  const [isPopoverOpen, togglePopover] = useToggle(false);
  const popoverId = useGeneratedHtmlId({
    prefix: 'streamFilterPopover',
  });

  const hasActiveFilters = selectedStreams.length > 0;

  const { availableStreams, streamCounts } = useMemo(() => {
    const streams = new Set<string>();
    const counts: Record<string, number> = {};

    for (const ki of knowledgeIndicators) {
      if (
        !matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedTypes,
          hideComputedTypes,
        })
      ) {
        continue;
      }

      const streamName = getKnowledgeIndicatorStreamName(ki);
      streams.add(streamName);

      if (!searchTerm || matchesKnowledgeIndicatorFilters(ki, { searchTerm })) {
        counts[streamName] = (counts[streamName] ?? 0) + 1;
      }
    }

    return {
      availableStreams: Array.from(streams).sort((left, right) => left.localeCompare(right)),
      streamCounts: counts,
    };
  }, [knowledgeIndicators, searchTerm, statusFilter, selectedTypes, hideComputedTypes]);

  const options = useMemo<EuiSelectableOption[]>(() => {
    const selectedSet = new Set(selectedStreams);
    return [
      {
        label: STREAM_FILTER_GROUP_LABEL,
        isGroupLabel: true,
      },
      ...availableStreams.map((stream) => ({
        key: stream,
        checked: selectedSet.has(stream) ? ('on' as const) : undefined,
        label: stream,
        append: <EuiBadge>{streamCounts[stream] ?? 0}</EuiBadge>,
      })),
    ];
  }, [availableStreams, selectedStreams, streamCounts]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        id={popoverId}
        aria-label={STREAM_FILTER_POPOVER_ARIA_LABEL}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            isSelected={isPopoverOpen}
            hasActiveFilters={hasActiveFilters}
            numFilters={availableStreams.length}
            numActiveFilters={selectedStreams.length}
            onClick={togglePopover}
          >
            {STREAM_FILTER_LABEL}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => togglePopover(false)}
        panelPaddingSize="none"
      >
        <EuiSelectable
          aria-label={STREAM_FILTER_SELECTABLE_ARIA_LABEL}
          options={options}
          onChange={(nextOptions) => {
            onSelectedStreamsChange(
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
              css={popoverPanelStyle}
            >
              {list}
            </EuiPanel>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}

const STREAM_FILTER_GROUP_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicators.streamFilterGroupLabel',
  {
    defaultMessage: 'Filter by stream',
  }
);

const STREAM_FILTER_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicators.streamFilterPopoverLabel',
  {
    defaultMessage: 'Stream filter',
  }
);

const STREAM_FILTER_LABEL = i18n.translate('xpack.streams.knowledgeIndicators.streamFilterLabel', {
  defaultMessage: 'Stream',
});

const STREAM_FILTER_SELECTABLE_ARIA_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicators.streamFilterSelectableAriaLabel',
  {
    defaultMessage: 'Filter knowledge indicators by stream',
  }
);
