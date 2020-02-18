/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { UptimeDatePicker } from '../components/functional/uptime_date_picker';
import { getMonitorPageBreadcrumb, getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { getTitle } from '../lib/helper/get_title';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { useUrlParams } from '../hooks';
import { MONITOR_ROUTE } from '../../common/constants';
import { Ping } from '../../common/graphql/types';

interface PageHeaderProps {
  monitorStatus?: Ping;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

export const PageHeaderComponent = ({ monitorStatus, setBreadcrumbs }: PageHeaderProps) => {
  const monitorPage = useRouteMatch({
    path: MONITOR_ROUTE,
  });

  const [getUrlParams] = useUrlParams();
  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = getUrlParams();

  const headingText = !monitorPage
    ? i18n.translate('xpack.uptime.overviewPage.headerText', {
        defaultMessage: 'Overview',
        description: `The text that will be displayed in the app's heading when the Overview page loads.`,
      })
    : monitorStatus?.url?.full;

  const [headerText, setHeaderText] = useState(headingText);

  useEffect(() => {
    if (monitorPage) {
      setHeaderText(monitorStatus?.url?.full ?? '');
      if (monitorStatus?.monitor) {
        const { name, id } = monitorStatus.monitor;
        document.title = getTitle((name || id) ?? '');
      }
    } else {
      setHeaderText(headingText);
      document.title = getTitle();
    }
  }, [monitorStatus, monitorPage, setHeaderText, headingText]);

  useEffect(() => {
    if (monitorPage) {
      if (headerText) {
        setBreadcrumbs(getMonitorPageBreadcrumb(headerText, stringifyUrlParams(params, true)));
      }
    } else {
      setBreadcrumbs(getOverviewPageBreadcrumbs());
    }
  }, [headerText, setBreadcrumbs, params, monitorPage]);

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap={true}>
        <EuiFlexItem>
          <EuiTitle>
            <h1>{headerText}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UptimeDatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
