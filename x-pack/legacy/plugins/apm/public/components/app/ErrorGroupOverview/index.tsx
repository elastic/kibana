/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../infra/public';
import { PROJECTION } from '../../../../common/projections/typings';
import {
  LocalUIFilters,
  LocalUIFilterProps
} from '../../shared/LocalUIFilters';
import { ErrorStatusFilter } from '../../shared/LocalUIFilters/ErrorStatusFilter';

const ErrorGroupOverview = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const {
    serviceName,
    start,
    end,
    sortField,
    sortDirection,
    errorStatus
  } = urlParams;

  const {
    data: errorDistributionData,
    refetch: refetchErrorDistribution
  } = useFetcher(
    callApmApi => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/errors/distribution',
          params: {
            path: {
              serviceName
            },
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  const {
    data: errorGroupListData,
    refetch: refetchErrorGroupList
  } = useFetcher(
    callApmApi => {
      const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/errors',
          params: {
            path: {
              serviceName
            },
            query: {
              start,
              end,
              sortField,
              sortDirection: normalizedSortDirection,
              uiFilters: JSON.stringify(uiFilters),
              errorStatus
            }
          }
        });
      }
    },
    [serviceName, start, end, sortField, sortDirection, uiFilters, errorStatus]
  );

  useTrackPageview({
    app: 'apm',
    path: 'error_group_overview'
  });
  useTrackPageview({ app: 'apm', path: 'error_group_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: LocalUIFilterProps = {
      filterNames: ['host', 'containerId', 'podName'],
      params: {
        serviceName,
        errorStatus
      },
      projection: PROJECTION.ERROR_GROUPS
    };

    return config;
  }, [errorStatus, serviceName]);

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <LocalUIFilters {...localUIFiltersConfig}>
          <ErrorStatusFilter />
          <EuiSpacer size="xl" />
          <EuiHorizontalRule margin="none" />
        </LocalUIFilters>
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel>
              <ErrorDistribution
                distribution={errorDistributionData}
                title={i18n.translate(
                  'xpack.apm.serviceDetails.metrics.errorOccurrencesChartTitle',
                  {
                    defaultMessage: 'Error occurrences'
                  }
                )}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiPanel>
          <EuiTitle size="xs">
            <h3>Errors</h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ErrorGroupList
            items={errorGroupListData}
            onUiStateChange={() => {
              return Promise.all([
                refetchErrorDistribution(),
                refetchErrorGroupList()
              ]).then(() => undefined);
            }}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { ErrorGroupOverview };
