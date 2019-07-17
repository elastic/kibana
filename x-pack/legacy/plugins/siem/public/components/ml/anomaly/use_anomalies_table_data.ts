/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useContext } from 'react';
import moment from 'moment-timezone';
import { anomaliesTableData } from '../api/anomalies_table_data';
import { InfluencerInput, Anomalies, CriteriaFields } from '../types';
import {
  KibanaConfigContext,
  AppKibanaFrameworkAdapter,
} from '../../../lib/adapters/framework/kibana_framework_adapter';
import { hasMlUserPermissions } from '../permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../permissions/ml_capabilities_provider';
import { useSiemJobs } from '../../ml_popover/hooks/use_siem_jobs';

interface Args {
  influencers?: InfluencerInput[];
  endDate: number;
  startDate: number;
  threshold?: number;
  skip?: boolean;
  criteriaFields?: CriteriaFields[];
}

type Return = [boolean, Anomalies | null];

export const influencersOrCriteriaToString = (
  influencers: InfluencerInput[] | CriteriaFields[]
): string =>
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

export const getThreshold = (
  config: Partial<AppKibanaFrameworkAdapter>,
  threshold: number
): number => {
  if (threshold !== -1) {
    return threshold;
  } else if (config.anomalyScore == null) {
    return 50;
  } else if (config.anomalyScore < 0) {
    return 0;
  } else if (config.anomalyScore > 100) {
    return 100;
  } else {
    return Math.floor(config.anomalyScore);
  }
};

export const useAnomaliesTableData = ({
  criteriaFields = [],
  influencers = [],
  startDate,
  endDate,
  threshold = -1,
  skip = false,
}: Args): Return => {
  const [tableData, setTableData] = useState<Anomalies | null>(null);
  const [, siemJobs] = useSiemJobs(true);
  const [loading, setLoading] = useState(true);
  const config = useContext(KibanaConfigContext);
  const capabilities = useContext(MlCapabilitiesContext);
  const userPermissions = hasMlUserPermissions(capabilities);

  const fetchFunc = async (
    influencersInput: InfluencerInput[],
    criteriaFieldsInput: CriteriaFields[],
    earliestMs: number,
    latestMs: number
  ) => {
    if (userPermissions && !skip && siemJobs.length > 0) {
      const data = await anomaliesTableData(
        {
          jobIds: siemJobs,
          criteriaFields: criteriaFieldsInput,
          aggregationInterval: 'auto',
          threshold: getThreshold(config, threshold),
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

  useEffect(() => {
    setLoading(true);
    fetchFunc(influencers, criteriaFields, startDate, endDate);
  }, [
    influencersOrCriteriaToString(influencers),
    influencersOrCriteriaToString(criteriaFields),
    startDate,
    endDate,
    skip,
    userPermissions,
    siemJobs.join(),
  ]);

  return [loading, tableData];
};
