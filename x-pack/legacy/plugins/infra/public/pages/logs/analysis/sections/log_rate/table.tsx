/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { EuiInMemoryTable } from '@elastic/eui';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';

interface Props {
  data: GetLogEntryRateSuccessResponsePayload['data'];
}

const startTimeLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.table.startTimeLabel',
  { defaultMessage: 'Start time' }
);
const anomalyScoreLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.table.anomalyScoreLabel',
  { defaultMessage: 'Anomaly score' }
);
const actualLogEntryRateLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.table.actualLogEntryRateLabel',
  { defaultMessage: 'Actual rate' }
);
const typicalLogEntryRateLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.table.typicalLogEntryRateLabel',
  { defaultMessage: 'Typical rate' }
);

export const TableView = ({ data }: Props) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat');

  const formattedAnomalies = useMemo(() => {
    return data.histogramBuckets.reduce((acc: any, bucket) => {
      if (bucket.dataSets.length > 0) {
        bucket.dataSets[0].anomalies.forEach(anomaly => {
          const formattedAnomaly = {
            startTime: moment(anomaly.startTime).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
            anomalyScore: Number(anomaly.anomalyScore).toFixed(3),
            typicalLogEntryRate: Number(anomaly.typicalLogEntryRate).toFixed(3),
            actualLogEntryRate: Number(anomaly.actualLogEntryRate).toFixed(3),
          };
          acc.push(formattedAnomaly);
        });
        return acc;
      } else {
        return acc;
      }
    }, []);
  }, [data]);

  const columns = [
    {
      field: 'startTime',
      name: startTimeLabel,
      sortable: true,
      'data-test-subj': 'startTimeCell',
    },
    {
      field: 'anomalyScore',
      name: anomalyScoreLabel,
      sortable: true,
      'data-test-subj': 'anomalyScoreCell',
    },
    {
      field: 'actualLogEntryRate',
      name: actualLogEntryRateLabel,
      sortable: true,
      'data-test-subj': 'actualLogEntryRateCell',
    },
    {
      field: 'typicalLogEntryRate',
      name: typicalLogEntryRateLabel,
      sortable: true,
      'data-test-subj': 'typicalLogEntryRateCell',
    },
  ];

  const initialSorting = {
    sort: {
      field: 'anomalyScore',
      direction: 'desc',
    },
  };

  return (
    <>
      <EuiInMemoryTable items={formattedAnomalies} columns={columns} sorting={initialSorting} />
    </>
  );
};
