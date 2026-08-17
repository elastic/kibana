/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SourceStatus, SourceType } from './types';
import type { SourceFilterOption } from './source_filter';
import { SourceFilter } from './source_filter';

interface SourcesToolbarProps {
  query: string;
  typeOptions: Array<SourceFilterOption<SourceType>>;
  statusOptions: Array<SourceFilterOption<SourceStatus>>;
  selectedTypes: SourceType[];
  selectedStatuses: SourceStatus[];
  isRefreshing: boolean;
  onQueryChange: (query: string) => void;
  onSelectedTypesChange: (types: SourceType[]) => void;
  onSelectedStatusesChange: (statuses: SourceStatus[]) => void;
  onRefresh: () => void;
  onAddSource: () => void;
}

export const SourcesToolbar = ({
  query,
  typeOptions,
  statusOptions,
  selectedTypes,
  selectedStatuses,
  isRefreshing,
  onQueryChange,
  onSelectedTypesChange,
  onSelectedStatusesChange,
  onRefresh,
  onAddSource,
}: SourcesToolbarProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={i18n.translate('xpack.streams.sources.searchPlaceholder', {
            defaultMessage: 'Search sources — e.g. AWS, nginx, OTLP',
          })}
          aria-label={i18n.translate('xpack.streams.sources.searchAriaLabel', {
            defaultMessage: 'Search sources',
          })}
          data-test-subj="streamsSourcesSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <SourceFilter
            label={i18n.translate('xpack.streams.sources.typeFilterLabel', {
              defaultMessage: 'Type',
            })}
            options={typeOptions}
            selectedValues={selectedTypes}
            onChange={onSelectedTypesChange}
          />
          <SourceFilter
            label={i18n.translate('xpack.streams.sources.statusFilterLabel', {
              defaultMessage: 'Status',
            })}
            options={statusOptions}
            selectedValues={selectedStatuses}
            onChange={onSelectedStatusesChange}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.streams.sources.refreshButtonLabel', {
            defaultMessage: 'Refresh',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            color="primary"
            display="base"
            iconType="refresh"
            size="m"
            isLoading={isRefreshing}
            onClick={onRefresh}
            aria-label={i18n.translate('xpack.streams.sources.refreshButtonAriaLabel', {
              defaultMessage: 'Refresh sources',
            })}
            data-test-subj="streamsSourcesRefreshButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false} aria-hidden>
        <EuiHorizontalRule
          margin="none"
          css={css`
            block-size: ${euiTheme.size.xl};
            inline-size: ${euiTheme.border.width.thin};
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={onAddSource} data-test-subj="streamsAddSourceButton">
          {i18n.translate('xpack.streams.sources.addSourceButtonLabel', {
            defaultMessage: 'Add source',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
