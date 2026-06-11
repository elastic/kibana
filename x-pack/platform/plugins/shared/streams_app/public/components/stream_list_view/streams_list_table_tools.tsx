/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { FILTERS_BUTTON_LABEL, YAML_BUTTON_LABEL } from './translations';

const FILTER_OPTIONS = [
  {
    value: 'all',
    label: i18n.translate('xpack.streams.streamsListTableTools.filters.allLabel', {
      defaultMessage: 'All',
    }),
  },
];

const DEFAULT_NEW_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamsListTableTools.newButtonLabel',
  { defaultMessage: 'New' }
);

interface StreamsListTableToolsProps {
  /** Label for the primary "New" button (e.g. "New destination"). */
  newButtonLabel?: string;
  /** Icon for the primary button. Defaults to `plus` for the "New" actions. */
  newButtonIconType?: string;
  /** Disables the primary button (e.g. "Save changes" until the canvas is dirty). */
  newButtonDisabled?: boolean;
}

/**
 * Shared demo toolbar (Filters popover, YAML, and a primary "New" button)
 * rendered in the `toolsRight` slot of the streams list tables. Reused across
 * the Destinations, Sources, and Pipelines tabs so they share the same layout.
 *
 * Note: these controls are presentational for the current demo branch and do
 * not yet drive any filtering or actions.
 */
export function StreamsListTableTools({
  newButtonLabel = DEFAULT_NEW_BUTTON_LABEL,
  newButtonIconType = 'plus',
  newButtonDisabled = false,
}: StreamsListTableToolsProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterValue, setFilterValue] = useState('all');

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isFiltersOpen}
          closePopover={() => setIsFiltersOpen(false)}
          anchorPosition="downLeft"
          panelPaddingSize="none"
          button={
            <EuiButton
              size="s"
              color="text"
              iconType="arrowDown"
              iconSide="right"
              onClick={() => setIsFiltersOpen((open) => !open)}
              data-test-subj="streamsListFiltersButton"
            >
              {FILTERS_BUTTON_LABEL}
            </EuiButton>
          }
        >
          <EuiContextMenuPanel
            size="s"
            items={FILTER_OPTIONS.map((option) => (
              <EuiContextMenuItem
                key={option.value}
                icon={filterValue === option.value ? 'check' : 'empty'}
                onClick={() => {
                  setFilterValue(option.value);
                  setIsFiltersOpen(false);
                }}
              >
                {option.label}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="editorCodeBlock"
          color="text"
          data-test-subj="streamsListYamlButton"
        >
          {YAML_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          fill
          iconType={newButtonIconType}
          isDisabled={newButtonDisabled}
          data-test-subj="streamsListNewButton"
        >
          {newButtonLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
