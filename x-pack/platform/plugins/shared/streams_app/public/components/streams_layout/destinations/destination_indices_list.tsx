/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResolvedIndicesStatus } from './state_machines/destinations_state_machine';
import type { DestinationViewModel } from './types';

interface DestinationIndicesListProps {
  destination: DestinationViewModel;
  indices: string[];
  status: ResolvedIndicesStatus;
  error?: string;
  onIndexClick: (indexName: string) => void;
  /** Flyout chrome: count title and “routed into” description. */
  showHeader?: boolean;
  titleId?: string;
}

export const DestinationIndicesList = ({
  destination,
  indices,
  status,
  error,
  onIndexClick,
  showHeader = false,
  titleId,
}: DestinationIndicesListProps) => {
  const { euiTheme } = useEuiTheme();
  const [query, setQuery] = useState('');

  const filteredIndices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return indices;
    }
    return indices.filter((indexName) => indexName.toLowerCase().includes(normalizedQuery));
  }, [indices, query]);

  const header = showHeader ? (
    <>
      <EuiTitle size="s">
        <h2 id={titleId}>
          {status === 'ready' ? (
            <FormattedMessage
              id="xpack.streams.destinations.indices.countTitle"
              defaultMessage="{count, plural, one {# index} other {# indices}}"
              values={{ count: indices.length }}
            />
          ) : (
            i18n.translate('xpack.streams.destinations.indices.fallbackTitle', {
              defaultMessage: 'Indices',
            })
          )}
        </h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.streams.destinations.indices.routedDescription"
            defaultMessage="Routed into {destinationName}."
            values={{ destinationName: destination.name }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
    </>
  ) : null;

  if (status === 'loading') {
    return (
      <div>
        {header}
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          data-test-subj="streamsDestinationIndicesLoading"
        >
          <EuiLoadingSpinner size="m" />
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.streams.destinations.indices.loadingDescription"
              defaultMessage="Loading indices"
            />
          </EuiText>
        </EuiFlexGroup>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div>
        {header}
        <EuiText size="s" color="danger" data-test-subj="streamsDestinationIndicesError">
          <p>
            {error ??
              i18n.translate('xpack.streams.destinations.indices.loadFailedDescription', {
                defaultMessage: 'Could not load indices for this destination.',
              })}
          </p>
        </EuiText>
      </div>
    );
  }

  if (indices.length === 0) {
    return (
      <div>
        {header}
        <EuiText size="s" color="subdued" data-test-subj="streamsDestinationIndicesEmpty">
          <p>
            <FormattedMessage
              id="xpack.streams.destinations.indices.emptyDescription"
              defaultMessage="No indices match this destination's write scope yet."
            />
          </p>
        </EuiText>
      </div>
    );
  }

  return (
    <div data-test-subj="streamsDestinationIndicesList">
      {header}
      <EuiFieldSearch
        fullWidth
        compressed
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={i18n.translate('xpack.streams.destinations.indices.searchPlaceholder', {
          defaultMessage: 'Search indices',
        })}
        aria-label={i18n.translate('xpack.streams.destinations.indices.searchAriaLabel', {
          defaultMessage: 'Search indices',
        })}
        data-test-subj="streamsDestinationIndicesSearch"
      />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.streams.destinations.indices.itemsCountDescription"
          defaultMessage="{count} {count, plural, one {item} other {items}}"
          values={{ count: filteredIndices.length }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      {filteredIndices.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.streams.destinations.indices.noSearchMatchesDescription"
              defaultMessage="No indices match your search."
            />
          </p>
        </EuiText>
      ) : (
        <div>
          {filteredIndices.map((indexName, rowIndex) => (
            <button
              key={indexName}
              type="button"
              onClick={() => onIndexClick(indexName)}
              data-test-subj="streamsDestinationIndexLink"
              css={css`
                display: block;
                width: 100%;
                margin: 0;
                padding: ${euiTheme.size.m} 0;
                border: none;
                border-bottom: ${euiTheme.border.thin};
                ${rowIndex === 0 ? `border-top: ${euiTheme.border.thin};` : ''}
                background: transparent;
                text-align: left;
                cursor: pointer;

                &:hover {
                  background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
                }
              `}
            >
              <EuiText size="s">{indexName}</EuiText>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
