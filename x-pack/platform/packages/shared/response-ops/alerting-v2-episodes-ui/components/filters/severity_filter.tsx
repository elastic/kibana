/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiPopover, EuiHealth, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EPISODE_SEVERITIES,
  EPISODE_SEVERITY_FILTER_NONE,
  EpisodeSeverity,
  getEpisodeSeverityLabel,
} from '../severity/severity_utils';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

type SeverityDotColorKey = Extract<keyof EuiThemeComputed['colors'], `text${string}`>;

// Resolved theme color per severity (rather than named tokens like `danger`) so the dot keeps its
// color when its row is highlighted/selected: `EuiIcon` applies custom color values inline, which
// beats `EuiSelectable`'s highlighted-row recolor. Colors mirror the severity badge colors.
const SEVERITY_DOT_COLOR_KEYS: Record<EpisodeSeverity, SeverityDotColorKey> = {
  [EpisodeSeverity.Critical]: 'textDanger',
  [EpisodeSeverity.High]: 'textRisk',
  [EpisodeSeverity.Medium]: 'textSuccess',
  [EpisodeSeverity.Low]: 'textPrimary',
  [EpisodeSeverity.Info]: 'textParagraph',
};

const SEVERITY_FILTER_OPTIONS: Array<{
  label: string;
  value: string;
  colorKey: SeverityDotColorKey;
}> = [
  ...EPISODE_SEVERITIES.map((severity) => ({
    label: getEpisodeSeverityLabel(severity),
    value: severity,
    colorKey: SEVERITY_DOT_COLOR_KEYS[severity],
  })),
  {
    label: i18n.SEVERITY_FILTER_NONE_LABEL,
    value: EPISODE_SEVERITY_FILTER_NONE,
    colorKey: 'textSubdued',
  },
];

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

  const options = useMemo(
    () =>
      SEVERITY_FILTER_OPTIONS.map(({ label, value, colorKey }) => ({
        label,
        value,
        prepend: <EuiHealth color={euiTheme.colors[colorKey]} />,
      })),
    [euiTheme]
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
          iconType="arrowDown"
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
