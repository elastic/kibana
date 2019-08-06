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
import { LocalUIFilterName } from '../../../../server/lib/ui_filters/local_ui_filters/config';
import { useFetcher } from '../../../hooks/useFetcher';
import {
  loadErrorDistribution,
  loadErrorGroupList
} from '../../../services/rest/apm/error_groups';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../infra/public';
import { PROJECTION } from '../../../projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';

const ErrorGroupOverview: React.SFC = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { serviceName, start, end, sortField, sortDirection } = urlParams;

  const { data: errorDistributionData } = useFetcher(() => {
    if (serviceName && start && end) {
      return loadErrorDistribution({
        serviceName,
        start,
        end,
        uiFilters
      });
    }
  }, [serviceName, start, end, uiFilters]);

  const { data: errorGroupListData } = useFetcher(() => {
    if (serviceName && start && end) {
      return loadErrorGroupList({
        serviceName,
        start,
        end,
        sortField,
        sortDirection,
        uiFilters
      });
    }
  }, [serviceName, start, end, sortField, sortDirection, uiFilters]);

  useTrackPageview({
    app: 'apm',
    path: 'error_group_overview'
  });
  useTrackPageview({ app: 'apm', path: 'error_group_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(
    () => ({
      filterNames: [
        'transactionResult',
        'host',
        'containerId',
        'podId'
      ] as LocalUIFilterName[],
      params: {
        serviceName
      },
      projection: PROJECTION.ERROR_GROUPS
    }),
    [serviceName]
  );

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <LocalUIFilters
          {...localUIFiltersConfig}
          showTransactionTypeFilter={true}
          allowEmptyTransactionType
        />
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
  );
};

export { ErrorGroupOverview };
