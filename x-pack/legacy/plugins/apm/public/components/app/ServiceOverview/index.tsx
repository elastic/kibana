/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import { toastNotifications } from 'ui/notify';
import url from 'url';
import { useFetcher } from '../../../hooks/useFetcher';
import { NoServicesMessage } from './NoServicesMessage';
import { ServiceList } from './ServiceList';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../infra/public';
import { useCore } from '../../../hooks/useCore';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { callApmApi } from '../../../services/rest/callApmApi';

const initalData = {
  items: [],
  hasHistoricalData: true,
  hasLegacyData: false
};

let hasDisplayedToast = false;

export function ServiceOverview() {
  const core = useCore();
  const {
    urlParams: { start, end },
    uiFilters
  } = useUrlParams();
  const { data = initalData, status } = useFetcher(() => {
    if (start && end) {
      return callApmApi({
        pathname: '/api/apm/services',
        params: {
          query: { start, end, uiFilters: JSON.stringify(uiFilters) }
        }
      });
    }
  }, [start, end, uiFilters]);

  useEffect(() => {
    if (data.hasLegacyData && !hasDisplayedToast) {
      hasDisplayedToast = true;
      toastNotifications.addWarning({
        title: i18n.translate('xpack.apm.serviceOverview.toastTitle', {
          defaultMessage:
            'Legacy data was detected within the selected time range'
        }),
        text: (
          <p>
            {i18n.translate('xpack.apm.serviceOverview.toastText', {
              defaultMessage:
                "You're running Elastic Stack 7.0+ and we've detected incompatible data from a previous 6.x version. If you want to view this data in APM, you should migrate it. See more in "
            })}

            <EuiLink
              href={url.format({
                pathname: core.http.basePath.prepend('/app/kibana'),
                hash: '/management/elasticsearch/upgrade_assistant'
              })}
            >
              {i18n.translate(
                'xpack.apm.serviceOverview.upgradeAssistantLink',
                {
                  defaultMessage: 'the upgrade assistant'
                }
              )}
            </EuiLink>
          </p>
        )
      });
    }
  }, [data.hasLegacyData, core.http.basePath]);

  useTrackPageview({ app: 'apm', path: 'services_overview' });
  useTrackPageview({ app: 'apm', path: 'services_overview', delay: 15000 });

  const localFiltersConfig: React.ComponentProps<
    typeof LocalUIFilters
  > = useMemo(
    () => ({
      filterNames: ['host', 'agentName'],
      projection: PROJECTION.SERVICES
    }),
    []
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <LocalUIFilters {...localFiltersConfig} />
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <EuiPanel>
          <ServiceList
            items={data.items}
            noItemsMessage={
              <NoServicesMessage
                historicalDataFound={data.hasHistoricalData}
                status={status}
              />
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
