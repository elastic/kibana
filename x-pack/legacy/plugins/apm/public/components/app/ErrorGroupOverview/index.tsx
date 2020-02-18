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
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../../../plugins/observability/public';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';

const ErrorGroupOverview: React.FC = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { serviceName, start, end, sortField, sortDirection } = urlParams;

  const { data: errorDistributionData } = useFetcher(
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

  const { data: errorGroupListData } = useFetcher(
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
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    [serviceName, start, end, sortField, sortDirection, uiFilters]
  );

  useTrackPageview({
    app: 'apm',
    path: 'error_group_overview'
  });
  useTrackPageview({ app: 'apm', path: 'error_group_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['host', 'containerId', 'podName', 'serviceVersion'],
      params: {
        serviceName
      },
      projection: PROJECTION.ERROR_GROUPS
    };

    return config;
  }, [serviceName]);

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localUIFiltersConfig} />
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

            <ErrorGroupList items={errorGroupListData} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export { ErrorGroupOverview };
