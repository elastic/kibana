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
import { Location } from 'history';
import React from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import {
  loadErrorDistribution,
  loadErrorGroupList
} from '../../../services/rest/apm/error_groups';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { useUiFilters } from '../../../context/UrlParamsContext';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';

interface ErrorGroupOverviewProps {
  urlParams: IUrlParams;
  location: Location;
}

const ErrorGroupOverview: React.SFC<ErrorGroupOverviewProps> = ({
  urlParams,
  location
}) => {
  const { serviceName, start, end, sortField, sortDirection } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data: errorDistributionData } = useFetcher(
    () => {
      if (serviceName && start && end) {
        return loadErrorDistribution({
          serviceName,
          start,
          end,
          uiFilters
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  const { data: errorGroupListData } = useFetcher(
    () => {
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
    },
    [serviceName, start, end, sortField, sortDirection, uiFilters]
  );

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <React.Fragment>
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
          urlParams={urlParams}
          items={errorGroupListData}
          location={location}
        />
      </EuiPanel>
    </React.Fragment>
  );
};

export { ErrorGroupOverview };
