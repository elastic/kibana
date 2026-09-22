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
import { FormattedMessage } from '@kbn/i18n-react';
import { SourceFilter, type SourceFilterOption } from '../sources/source_filter';
import { LOCAL_ELASTICSEARCH_LABEL } from './destination_type_config';
import type { DestinationType } from './types';

interface DestinationsToolbarProps {
  query: string;
  selectedTypes: DestinationType[];
  isRefreshing: boolean;
  onQueryChange: (query: string) => void;
  onSelectedTypesChange: (types: DestinationType[]) => void;
  onRefresh: () => void;
  onAddDestination: () => void;
}

const TYPE_OPTIONS: Array<SourceFilterOption<DestinationType>> = [
  { key: 'elasticsearch', label: LOCAL_ELASTICSEARCH_LABEL },
];

export const DestinationsToolbar = ({
  query,
  selectedTypes,
  isRefreshing,
  onQueryChange,
  onSelectedTypesChange,
  onRefresh,
  onAddDestination,
}: DestinationsToolbarProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={i18n.translate('xpack.streams.destinations.searchPlaceholder', {
            defaultMessage: 'Search destinations — e.g. logs, nginx, elasticsearch',
          })}
          aria-label={i18n.translate('xpack.streams.destinations.searchAriaLabel', {
            defaultMessage: 'Search destinations',
          })}
          data-test-subj="streamsDestinationsSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <SourceFilter
            label={i18n.translate('xpack.streams.destinations.typeFilterLabel', {
              defaultMessage: 'Type',
            })}
            options={TYPE_OPTIONS}
            selectedValues={selectedTypes}
            onChange={onSelectedTypesChange}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.streams.destinations.refreshButtonLabel', {
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
            aria-label={i18n.translate('xpack.streams.destinations.refreshButtonAriaLabel', {
              defaultMessage: 'Refresh destinations',
            })}
            data-test-subj="streamsDestinationsRefreshButton"
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
        <EuiButton fill onClick={onAddDestination} data-test-subj="streamsAddDestinationButton">
          <FormattedMessage
            id="xpack.streams.destinations.addDestinationButtonLabel"
            defaultMessage="Add destination"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
