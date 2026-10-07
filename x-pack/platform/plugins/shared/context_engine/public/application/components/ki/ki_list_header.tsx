/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSuperSelect,
  type EuiSuperSelectOption,
  EuiText,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { ALL_TYPE_FILTER, type KiListTypeFilter } from './helpers';

const TYPE_FILTER_MIN_WIDTH = '18rem';

interface TypeFilterOption {
  value: string;
  label: string;
  'data-test-subj': string;
}

interface KiListHeaderProps {
  destValue: string;
  indexManagementHref?: string;
  discoverHref?: string;
  typeFilter: KiListTypeFilter;
  typeFilterOptions: TypeFilterOption[];
  onTypeFilterChange: (filter: KiListTypeFilter) => void;
}

export const KiListHeader = ({
  destValue,
  indexManagementHref,
  discoverHref,
  typeFilter,
  typeFilterOptions,
  onTypeFilterChange,
}: KiListHeaderProps) => {
  const destLink =
    indexManagementHref !== undefined ? (
      <EuiLink
        href={indexManagementHref}
        data-test-subj="contextKiListPanelDestLink"
        {...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageKiListPanel,
          action: CONTEXT_ENGINE_UI_EBT.action.kiList.DEST_LINK,
        })}
      >
        {destValue}
      </EuiLink>
    ) : (
      <code data-test-subj="contextKiListPanelDest">{destValue}</code>
    );

  const typeFilterLegend = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.kiList.typeFilterLegend',
    {
      defaultMessage: 'Filter Knowledge Indicators by type',
    }
  );

  const superSelectOptions = useMemo(
    (): Array<EuiSuperSelectOption<string>> =>
      typeFilterOptions.map(({ value, label, 'data-test-subj': dataTestSubj, ...ebtProps }) => ({
        value,
        inputDisplay: label,
        dropdownDisplay: label,
        'data-test-subj': dataTestSubj,
        ...ebtProps,
      })),
    [typeFilterOptions]
  );

  const showTypeFilter = typeFilterOptions.length > 1;

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
      {showTypeFilter && (
        <EuiFlexItem grow={false}>
          <div style={{ minWidth: TYPE_FILTER_MIN_WIDTH }}>
            <EuiSuperSelect
              aria-label={typeFilterLegend}
              compressed
              fullWidth
              data-test-subj="contextKiListTypeFilters"
              options={superSelectOptions}
              valueOfSelected={typeFilter.value}
              onChange={(id) => {
                onTypeFilterChange(
                  id === ALL_TYPE_FILTER.value ? ALL_TYPE_FILTER : { kind: 'type', value: id }
                );
              }}
            />
          </div>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          justifyContent="flexEnd"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj="contextKiListPanelSummary">
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.kiList.backingIndex"
                defaultMessage="Backing index {dest}"
                values={{ dest: destLink }}
              />
            </EuiText>
          </EuiFlexItem>
          {discoverHref && (
            <EuiFlexItem grow={false}>
              <EuiLink
                href={discoverHref}
                target="_blank"
                rel="noopener noreferrer"
                data-test-subj="contextKiListDiscoverLink"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageKiListPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.kiList.DISCOVER_LINK,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.kiList.discoverLink"
                  defaultMessage="View raw docs in Discover"
                />
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
