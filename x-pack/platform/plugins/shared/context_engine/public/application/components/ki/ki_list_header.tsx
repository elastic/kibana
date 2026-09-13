/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ALL_TYPE_FILTER, type KiListTypeFilter } from './helpers';

interface TypeFilterOption {
  id: string;
  label: string;
  'data-test-subj': string;
}

interface KiListHeaderProps {
  total: number;
  destValue: string;
  indexManagementHref?: string;
  discoverHref?: string;
  typeFilter: KiListTypeFilter;
  typeFilterOptions: TypeFilterOption[];
  onTypeFilterChange: (filter: KiListTypeFilter) => void;
}

export const KiListHeader = ({
  total,
  destValue,
  indexManagementHref,
  discoverHref,
  typeFilter,
  typeFilterOptions,
  onTypeFilterChange,
}: KiListHeaderProps) => {
  const destLink =
    indexManagementHref !== undefined ? (
      <EuiLink href={indexManagementHref} data-test-subj="contextKiListPanelDestLink">
        {destValue}
      </EuiLink>
    ) : (
      <code data-test-subj="contextKiListPanelDest">{destValue}</code>
    );

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="contextKiListPanelSummary">
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.kiList.summary"
              defaultMessage="{count, plural, one {# {indicatorLabel}} other {# {indicatorLabel}}} in"
              values={{
                count: total,
                indicatorLabel: (
                  <strong>
                    {i18n.translate(
                      'xpack.contextEngine.aiIndexDetail.kiList.summaryIndicatorLabel',
                      {
                        defaultMessage:
                          '{count, plural, one {Knowledge Indicator} other {Knowledge Indicators}}',
                        values: { count: total },
                      }
                    )}
                  </strong>
                ),
              }}
            />{' '}
            {destLink}
          </EuiText>
        </EuiFlexItem>
        {discoverHref && (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={discoverHref}
              target="_blank"
              rel="noopener noreferrer"
              data-test-subj="contextKiListDiscoverLink"
            >
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.kiList.discoverLink"
                defaultMessage="View raw docs in Discover"
              />
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {typeFilterOptions.length > 1 && (
        <>
          <EuiSpacer size="m" />
          <EuiButtonGroup
            legend={i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.typeFilterLegend', {
              defaultMessage: 'Filter Knowledge Indicators by type',
            })}
            type="single"
            buttonSize="compressed"
            idSelected={typeFilter.value}
            onChange={(id) => {
              onTypeFilterChange(
                id === ALL_TYPE_FILTER.value ? ALL_TYPE_FILTER : { kind: 'type', value: id }
              );
            }}
            options={typeFilterOptions}
            data-test-subj="contextKiListTypeFilters"
          />
        </>
      )}
    </>
  );
};
