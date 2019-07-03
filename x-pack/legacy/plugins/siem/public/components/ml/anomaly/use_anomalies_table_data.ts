/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useContext } from 'react';
import moment from 'moment-timezone';
import { anomaliesTableData } from '../api/anomalies_table_data';
import { InfluencerInput, Anomalies } from '../types';
import {
  KibanaConfigContext,
  AppKibanaFrameworkAdapter,
} from '../../../lib/adapters/framework/kibana_framework_adapter';
import { hasMlUserPermissions } from '../permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../permissions/ml_capabilities_provider';

interface Args {
  influencers: InfluencerInput[] | null;
  endDate: number;
  startDate: number;
  threshold?: number;
  skip?: boolean;
}

type Return = [boolean, Anomalies | null];

export const influencersToString = (influencers: InfluencerInput[] | null): string =>
  influencers == null
    ? ''
    : influencers.reduce((accum, item) => `${accum}${item.fieldName}:${item.fieldValue}`, '');

export const getTimeZone = (config: Partial<AppKibanaFrameworkAdapter>): string => {
  if (config.dateFormatTz !== 'Browser' && config.dateFormatTz != null) {
    return config.dateFormatTz;
  } else if (config.dateFormatTz === 'Browser' && config.timezone != null) {
    return config.timezone;
  } else {
    return moment.tz.guess();
  }
};

export const useAnomaliesTableData = ({
  influencers,
  startDate,
  endDate,
  threshold = 0,
  skip = false,
}: Args): Return => {
  const [tableData, setTableData] = useState<Anomalies | null>(null);
  const [loading, setLoading] = useState(true);
  const config = useContext(KibanaConfigContext);
  const capabilities = useContext(MlCapabilitiesContext);

  const fetchFunc = async (
    influencersInput: InfluencerInput[] | null,
    earliestMs: number,
    latestMs: number
  ) => {
    const userPermissions = hasMlUserPermissions(capabilities);
    if (userPermissions && influencersInput != null && !skip) {
      const data = await anomaliesTableData(
        {
          jobIds: [],
          criteriaFields: [],
          aggregationInterval: 'auto',
          threshold,
          earliestMs,
          latestMs,
          influencers: influencersInput,
          dateFormatTz: getTimeZone(config),
          maxRecords: 500,
          maxExamples: 10,
        },
        {
          'kbn-version': config.kbnVersion,
        }
      );
      setTableData(data);
      setLoading(false);
    } else if (!userPermissions) {
      setLoading(false);
    } else {
      setTableData(null);
      setLoading(true);
    }
  };

  useEffect(
    () => {
      setLoading(true);
      fetchFunc(influencers, startDate, endDate);
    },
    [influencersToString(influencers), startDate, endDate, skip]
  );

  return [loading, tableData];
};
