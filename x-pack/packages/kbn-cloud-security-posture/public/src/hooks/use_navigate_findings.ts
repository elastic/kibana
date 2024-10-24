/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import {
  SECURITY_DEFAULT_DATA_VIEW_ID,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
} from '@kbn/cloud-security-posture-common';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { findingsNavigation } from '../constants/navigation';
import { useDataView } from './use_data_view';
import { CspClientPluginStartDeps } from '../..';
import { NavFilter, encodeQueryUrl, queryFilters } from '../utils/query_utils';

// dataViewId is used to prevent FilterManager from falling back to the default in the sorcerer (logs-*)
const useNavigate = (pathname: string, dataViewId = SECURITY_DEFAULT_DATA_VIEW_ID) => {
  const history = useHistory();

  const { services } = useKibana<CoreStart & CspClientPluginStartDeps>();
  return useCallback(
    (filterParams: NavFilter = {}, groupBy?: string[]) => {
      const filters = queryFilters(filterParams, dataViewId);

      history.push({
        pathname,
        search: encodeQueryUrl(services.data, filters, groupBy),
      });
    },
    [dataViewId, history, pathname, services.data]
  );
};

export const useNavigateFindings = () => {
  const { data } = useDataView(CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX);
  return useNavigate(findingsNavigation.findings_default.path, data?.id);
};

export const useNavigateVulnerabilities = () =>
  useNavigate(findingsNavigation.vulnerabilities.path);
