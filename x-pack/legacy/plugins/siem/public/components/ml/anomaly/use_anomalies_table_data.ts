/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useContext } from 'react';
import { anomaliesTableData } from '../api/anomalies_table_data';
import { InfluencerInput, Anomalies, CriteriaFields } from '../types';
import { hasMlUserPermissions } from '../permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../permissions/ml_capabilities_provider';
import { useSiemJobs } from '../../ml_popover/hooks/use_siem_jobs';
import { useStateToaster } from '../../toasters';
import { errorToToaster } from '../api/error_to_toaster';

import * as i18n from './translations';
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import {
  DEFAULT_ANOMALY_SCORE,
  DEFAULT_TIMEZONE_BROWSER,
  DEFAULT_KBN_VERSION,
} from '../../../../common/constants';

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

export const getThreshold = (anomalyScore: number | undefined, threshold: number): number => {
  if (threshold !== -1) {
    return threshold;
  } else if (anomalyScore == null) {
    return 50;
  } else if (anomalyScore < 0) {
    return 0;
  } else if (anomalyScore > 100) {
    return 100;
  } else {
    return Math.floor(anomalyScore);
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
  const capabilities = useContext(MlCapabilitiesContext);
  const userPermissions = hasMlUserPermissions(capabilities);
  const [, dispatchToaster] = useStateToaster();
  const [timezone] = useKibanaUiSetting(DEFAULT_TIMEZONE_BROWSER);
  const [anomalyScore] = useKibanaUiSetting(DEFAULT_ANOMALY_SCORE);
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  const fetchFunc = async (
    influencersInput: InfluencerInput[],
    criteriaFieldsInput: CriteriaFields[],
    earliestMs: number,
    latestMs: number
  ) => {
    if (userPermissions && !skip && siemJobs.length > 0) {
      try {
        const data = await anomaliesTableData(
          {
            jobIds: siemJobs,
            criteriaFields: criteriaFieldsInput,
            aggregationInterval: 'auto',
            threshold: getThreshold(anomalyScore, threshold),
            earliestMs,
            latestMs,
            influencers: influencersInput,
            dateFormatTz: timezone,
            maxRecords: 500,
            maxExamples: 10,
          },
          {
            'kbn-version': kbnVersion,
          }
        );
        setTableData(data);
        setLoading(false);
      } catch (error) {
        errorToToaster({ title: i18n.SIEM_TABLE_FETCH_FAILURE, error, dispatchToaster });
        setLoading(false);
      }
    } else if (!userPermissions) {
      setLoading(false);
    } else if (siemJobs.length === 0) {
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
