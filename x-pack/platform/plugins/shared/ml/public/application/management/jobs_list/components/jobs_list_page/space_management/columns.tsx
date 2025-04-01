/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { TrainedModelLink } from '../../../../../model_management/model_link';
import type { MlSavedObjectType } from '../../../../../../../common/types/saved_objects';
import type {
  AnalyticsManagementItems,
  AnomalyDetectionManagementItems,
  TrainedModelsManagementItems,
} from '../../../../../../../common/types/management';
import { AnomalyDetectionJobIdLink } from '../../../../../jobs/jobs_list/components/jobs_list/job_id_link';
import { DFAnalyticsJobIdLink } from '../../../../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_columns';

export function getColumns(mlSavedObjectType: MlSavedObjectType) {
  switch (mlSavedObjectType) {
    case 'anomaly-detector':
      return adColumns;
    case 'data-frame-analytics':
      return dfaColumns;
    case 'trained-model':
      return trainedModelColumns;

    default:
      return [];
  }
}

const adColumns: Array<EuiBasicTableColumn<AnomalyDetectionManagementItems>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.trainedModels.ad.id', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnId',
    scope: 'row',
    width: '250px',
    render: (id: string) => <AnomalyDetectionJobIdLink id={id} />,
  },
  {
    field: 'description',
    name: i18n.translate(
      'xpack.ml.management.spaceManagementTableColumn.trainedModels.ad.description',
      {
        defaultMessage: 'Description',
      }
    ),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnDescription',
  },
  {
    field: 'jobState',
    name: i18n.translate(
      'xpack.ml.management.spaceManagementTableColumn.trainedModels.ad.jobState',
      {
        defaultMessage: 'Job state',
      }
    ),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnJobState',
    width: '100px',
  },
  {
    field: 'datafeedState',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.ad.datafeedState', {
      defaultMessage: 'Datafeed state',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnDatafeedState',
    width: '150px',
  },
];

const dfaColumns: Array<EuiBasicTableColumn<AnalyticsManagementItems>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.dfa.id', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnId',
    scope: 'row',
    width: '250px',
    render: (id: string) => <DFAnalyticsJobIdLink jobId={id} />,
  },
  {
    field: 'description',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.dfa.description', {
      defaultMessage: 'Description',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnDescription',
  },
  {
    field: 'source_index',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.dfa.source_index', {
      defaultMessage: 'Source index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnSourceIndex',
    width: '200px',
  },
  {
    field: 'dest_index',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.dfa.dest_index', {
      defaultMessage: 'Destination index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnDestIndex',
    width: '200px',
  },
  {
    field: 'job_type',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.dfa.job_type', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnJobType',
    width: '150px',
  },
  {
    field: 'state',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.dfa.state', {
      defaultMessage: 'Status',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnState',
    width: '100px',
  },
];

const trainedModelColumns: Array<EuiBasicTableColumn<TrainedModelsManagementItems>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.trainedModels.id', {
      defaultMessage: 'ID',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnId',
    scope: 'row',
    width: '250px',
    render: (id: string) => <TrainedModelLink id={id} />,
  },
  {
    field: 'description',
    name: i18n.translate(
      'xpack.ml.management.spaceManagementTableColumn.trainedModels.description',
      {
        defaultMessage: 'Description',
      }
    ),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnDescription',
  },
  {
    field: 'type',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.trainedModels.type', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnType',
    width: '250px',
  },
  {
    field: 'state',
    name: i18n.translate('xpack.ml.management.spaceManagementTableColumn.trainedModels.state', {
      defaultMessage: 'State',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlSpaceManagementTableColumnState',
    width: '100px',
  },
];
