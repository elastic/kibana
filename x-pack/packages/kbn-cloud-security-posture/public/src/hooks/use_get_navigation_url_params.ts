/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  SECURITY_DEFAULT_DATA_VIEW_ID,
  CLOUD_SECURITY_POSTURE_PATH,
} from '@kbn/cloud-security-posture-common';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback } from 'react';
import { CspClientPluginStartDeps } from '../types';
import { encodeQuery } from '../utils/query_utils';
import { NavFilter, createFilter } from './use_navigate_findings';
import { useDataView } from './use_data_view';

/* If we put this on constant folder and import it here, it will cause our bundle size to go above the limit */
const findingPageNavigationUrl = {
  findings: {
    path: `${CLOUD_SECURITY_POSTURE_PATH}/findings/configurations`,
  },
  vulnerabilities: {
    path: `${CLOUD_SECURITY_POSTURE_PATH}/findings/vulnerabilities`,
  },
};

export const useGetNavigationUrlParams = (
  pathname: string,
  dataViewId = SECURITY_DEFAULT_DATA_VIEW_ID
) => {
  const { services } = useKibana<CoreStart & CspClientPluginStartDeps>();

  return useCallback(
    (filterParams: NavFilter = {}, groupBy?: string[]) => {
      const filters = Object.entries(filterParams).map(([key, filterValue]) =>
        createFilter(key, filterValue, dataViewId)
      );

      const searchParams = new URLSearchParams(
        encodeQuery({
          query: services.data.query.queryString.getDefaultQuery(),
          filters,
          ...(groupBy && { groupBy }),
        })
      );

      return `${pathname}?${searchParams.toString()}`;
    },
    [pathname, services.data.query.queryString, dataViewId]
  );
};

export const useGetNavigationUrlParamsFindings = () => {
  const { data } = useDataView(CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX);
  return useGetNavigationUrlParams(findingPageNavigationUrl.findings.path, data?.id);
};

export const useGetNavigationUrlParamsVulnerabilities = () =>
  useGetNavigationUrlParams(findingPageNavigationUrl.vulnerabilities.path);
