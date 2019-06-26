/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  EuiCode,
  EuiFlexItem,
  EuiFlexGroup,
  // @ts-ignore EuiSearchBar not typed yet
  EuiSearchBar,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { FilterBar as FilterBarType, MonitorKey } from '../../../common/graphql/types';
import { UptimeSearchBarQueryChangeHandler } from '../../pages/overview';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { filterBarQuery } from '../../queries';
import { FilterBarLoading } from './filter_bar_loading';
import { filterBarSearchSchema } from './search_schema';

interface FilterBarQueryResult {
  filterBar?: FilterBarType;
}

interface FilterBarProps {
  currentQuery?: string;
  error?: any;
  updateQuery: UptimeSearchBarQueryChangeHandler;
}

type Props = FilterBarProps & UptimeGraphQLQueryProps<FilterBarQueryResult>;

const SEARCH_THRESHOLD = 2;

export const FilterBarComponent = ({ currentQuery, data, error, updateQuery }: Props) => {
  if (!data || !data.filterBar) {
    return <FilterBarLoading />;
  }
  const {
    filterBar: { ids, locations, names, ports, schemes },
  } = data;
  // TODO: add a factory function + type for these filter options
  const filters = [
    {
      type: 'field_value_toggle_group',
      field: 'monitor.status',
      items: [
        {
          value: 'up',
          name: i18n.translate('xpack.uptime.filterBar.filterUpLabel', {
            defaultMessage: 'Up',
          }),
        },
        {
          value: 'down',
          name: i18n.translate('xpack.uptime.filterBar.filterDownLabel', {
            defaultMessage: 'Down',
          }),
        },
      ],
    },
    {
      type: 'field_value_selection',
      field: 'observer.geo.name',
      name: i18n.translate('xpack.uptime.filterBar.options.location.name', {
        defaultMessage: 'Location',
        description:
          'A label applied to a button that lets users filter monitors by their location.',
      }),
      options: locations ? locations.map(location => ({ value: location, view: location })) : [],
    },
    {
      type: 'field_value_selection',
      field: 'monitor.id',
      name: i18n.translate('xpack.uptime.filterBar.options.idLabel', {
        defaultMessage: 'ID',
      }),
      multiSelect: false,
      options: ids
        ? ids.map(({ key }: MonitorKey) => ({
            value: key,
            view: key,
          }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'monitor.name',
      name: i18n.translate('xpack.uptime.filterBar.options.nameLabel', {
        defaultMessage: 'Name',
      }),
      multiSelect: false,
      options: names
        ? names.map((nameValue: string) => ({ value: nameValue, view: nameValue }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'url.full',
      name: i18n.translate('xpack.uptime.filterBar.options.urlLabel', {
        defaultMessage: 'URL',
      }),
      multiSelect: false,
      options: ids ? ids.map(({ url }: MonitorKey) => ({ value: url, view: url })) : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'url.port',
      name: i18n.translate('xpack.uptime.filterBar.options.portLabel', {
        defaultMessage: 'Port',
      }),
      multiSelect: false,
      options: ports
        ? ports.map((portValue: any) => ({
            value: portValue,
            view: portValue,
          }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
    {
      type: 'field_value_selection',
      field: 'monitor.type',
      name: i18n.translate('xpack.uptime.filterBar.options.schemeLabel', {
        defaultMessage: 'Scheme',
      }),
      multiSelect: false,
      options: schemes
        ? schemes.map((schemeValue: string) => ({
            value: schemeValue,
            view: schemeValue,
          }))
        : [],
      searchThreshold: SEARCH_THRESHOLD,
    },
  ];
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <div data-test-subj="xpack.uptime.filterBar">
          <EuiSearchBar
            box={{
              incremental: false,
              placeholder: currentQuery,
            }}
            className="euiFlexGroup--gutterSmall"
            onChange={updateQuery}
            filters={filters}
            query={error || currentQuery === '' ? undefined : currentQuery}
            schema={filterBarSearchSchema}
          />
        </div>
      </EuiFlexItem>
      {!!error && (
        <EuiFlexItem>
          <EuiCallOut title={error.name || ''} color="danger" iconType="cross">
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.uptime.filterBar.errorCalloutMessage"
                    defaultMessage="{codeBlock} cannot be parsed"
                    values={{ codeBlock: <EuiCode>{currentQuery}</EuiCode> }}
                  />
                </EuiText>
              </EuiFlexItem>
              {!!error.message && <EuiFlexItem>{error.message}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const FilterBar = withUptimeGraphQL<FilterBarQueryResult, FilterBarProps>(
  FilterBarComponent,
  filterBarQuery
);
