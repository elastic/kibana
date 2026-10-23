/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiPopover, EuiHealth, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { EPISODE_SEVERITY_FILTER_NONE } from '../severity/severity_utils';
import { useSeverityRegistry } from '../../hooks/use_severity_registry';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

type SeverityDotColorKey = Extract<keyof EuiThemeComputed['colors'], `text${string}`>;

interface AlertEpisodesSeverityFilterProps {
  selectedSeverities?: string[] | null;
  onSeveritiesChange: (severities: string[] | undefined) => void;
  'data-test-subj'?: string;
}

export function AlertEpisodesSeverityFilter({
  selectedSeverities,
  onSeveritiesChange,
  'data-test-subj': dataTestSubj = 'severityFilter',
}: AlertEpisodesSeverityFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const { entries } = useSeverityRegistry();

  const resolveDotColor = useCallback(
    (colorKey?: string) =>
      euiTheme.colors[(colorKey ?? 'textSubdued') as SeverityDotColorKey] ?? colorKey,
    [euiTheme]
  );

  const options = useMemo(
    () => [
      ...entries.map(({ label, value, filterDotColor }) => ({
        label,
        value,
        prepend: <EuiHealth color={resolveDotColor(filterDotColor)} />,
      })),
      {
        label: i18n.SEVERITY_FILTER_NONE_LABEL,
        value: EPISODE_SEVERITY_FILTER_NONE,
        prepend: <EuiHealth color={resolveDotColor()} />,
      },
    ],
    [resolveDotColor, entries]
  );

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onSeveritiesChange(values.length > 0 ? values : undefined);
    },
    [onSeveritiesChange]
  );

  const selectedValues = selectedSeverities ?? [];
  const activeCount = selectedValues.length;

  return (
    <EuiPopover
      aria-label={i18n.SEVERITY_FILTER_ARIA_LABEL}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numFilters={options.length}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {i18n.SEVERITY_FILTER_LABEL}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <InlineFilterPopover
        options={options}
        selectedValues={selectedValues}
        singleSelect={false}
        onSelectionChange={handleSelectionChange}
        emptyMessage={i18n.SEVERITY_FILTER_NO_MATCH}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
