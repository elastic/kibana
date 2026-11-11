/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiFilterButton, EuiPopover } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { EPISODE_SEVERITY_FILTER_NONE } from '../severity/severity_utils';
import { AlertEpisodeSeverityBadge } from '../severity/episode_severity_badge';
import { useSeverityRegistry } from '../../hooks/use_severity_registry';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

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
  const { entries } = useSeverityRegistry();

  // Soft severity badges as the option content (Cases Status filter pattern).
  const options = useMemo(
    () => [
      ...[...entries].reverse().map(({ label, value }) => ({
        label,
        value,
      })),
      {
        label: i18n.SEVERITY_FILTER_NONE_LABEL,
        value: EPISODE_SEVERITY_FILTER_NONE,
      },
    ],
    [entries]
  );

  const renderOption = useCallback((option: EuiSelectableOption) => {
    if (option.key === EPISODE_SEVERITY_FILTER_NONE) {
      return <EuiBadge color="hollow">{option.label}</EuiBadge>;
    }
    return <AlertEpisodeSeverityBadge severity={String(option.key)} />;
  }, []);

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
        renderOption={renderOption}
        emptyMessage={i18n.SEVERITY_FILTER_NO_MATCH}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
