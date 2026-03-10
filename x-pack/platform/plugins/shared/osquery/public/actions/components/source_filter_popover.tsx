/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiFilterSelectItem, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SourceFilter } from '../../../common/api/unified_history/types';

const SOURCE_LABEL = i18n.translate('xpack.osquery.historyFilters.sourceLabel', {
  defaultMessage: 'Source',
});

interface SourceOption {
  key: SourceFilter;
  label: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    key: 'live',
    label: i18n.translate('xpack.osquery.historyFilters.source.live', { defaultMessage: 'Live' }),
  },
  {
    key: 'rule',
    label: i18n.translate('xpack.osquery.historyFilters.source.rule', { defaultMessage: 'Rule' }),
  },
  {
    key: 'scheduled',
    label: i18n.translate('xpack.osquery.historyFilters.source.scheduled', {
      defaultMessage: 'Scheduled',
    }),
  },
];

const PANEL_PROPS = { 'data-test-subj': 'history-source-filter-popover' };

interface SourceFilterPopoverProps {
  selectedSources: SourceFilter[];
  onSelectedSourcesChanged: (sources: SourceFilter[]) => void;
}

const SourceFilterPopoverComponent: React.FC<SourceFilterPopoverProps> = ({
  selectedSources,
  onSelectedSourcesChanged,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedSources), [selectedSources]);

  const handleToggle = useCallback(
    (key: SourceFilter) => {
      const updated = selectedSet.has(key)
        ? selectedSources.filter((s) => s !== key)
        : [...selectedSources, key];
      onSelectedSourcesChanged(updated);
    },
    [selectedSources, selectedSet, onSelectedSourcesChanged]
  );

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const activeCount = selectedSources.length;
  const isFiltered = activeCount > 0;
  const displayCount = isFiltered ? activeCount : SOURCE_OPTIONS.length;

  const triggerButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      isSelected={isOpen}
      hasActiveFilters={isFiltered}
      numActiveFilters={displayCount}
      data-test-subj="history-source-filter-button"
    >
      {SOURCE_LABEL}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={PANEL_PROPS}
    >
      <EuiPopoverTitle paddingSize="s">{SOURCE_LABEL}</EuiPopoverTitle>
      {SOURCE_OPTIONS.map(({ key, label }) => (
        <EuiFilterSelectItem
          key={key}
          checked={selectedSet.has(key) ? 'on' : undefined}
          onClick={() => handleToggle(key)}
          data-test-subj={`history-source-filter-${key}`}
        >
          {label}
        </EuiFilterSelectItem>
      ))}
    </EuiPopover>
  );
};

SourceFilterPopoverComponent.displayName = 'SourceFilterPopover';

export const SourceFilterPopover = React.memo(SourceFilterPopoverComponent);
