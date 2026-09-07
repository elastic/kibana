/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import type { EuiTableFieldDataColumnType, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiButtonEmpty, EuiInMemoryTable } from '@elastic/eui';

import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import type {
  RecognizeModuleResult,
  RecognizeModuleResultDataView,
} from '@kbn/ml-common-types/modules';
import { useMlKibana, useMlManagementLocator } from '../../contexts/kibana';
import { getIsMlCpsEnabled } from '../../services/ml_server_info';

interface Props {
  matchingDataViews: RecognizeModuleResult;
  moduleId: string;
  jobsLength: number;
}

export const DataViewsTable: FC<Props> = ({ matchingDataViews, moduleId, jobsLength }) => {
  const {
    services: {
      application: { navigateToUrl },
      cps,
    },
  } = useMlKibana();
  const mlManagementLocator = useMlManagementLocator()!;
  const isMlCpsEnabled = getIsMlCpsEnabled();

  const getUrl = useCallback(
    (id: string) => {
      const projectRouting =
        isMlCpsEnabled && cps?.cpsManager ? cps?.cpsManager?.getProjectRouting() : undefined;
      const params = new URLSearchParams();
      params.set('id', moduleId);
      params.set('index', id);

      if (projectRouting !== undefined && projectRouting !== '') {
        params.set('project_routing', projectRouting);
      }

      return mlManagementLocator.getRedirectUrl({
        sectionId: 'ml',
        appId: `anomaly_detection/${
          ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER
        }?${params.toString()}`,
      });
    },
    [mlManagementLocator, moduleId, cps?.cpsManager, isMlCpsEnabled]
  );

  const columns: Array<
    | EuiTableFieldDataColumnType<RecognizeModuleResultDataView>
    | EuiTableActionsColumnType<RecognizeModuleResultDataView>
  > = [
    {
      field: 'title',
      name: i18n.translate(
        'xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.dataViewMatches.dataViewTitleColumnName',
        {
          defaultMessage: 'Title',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'name',
      name: i18n.translate(
        'xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.dataViewMatches.dataViewNameColumnName',
        {
          defaultMessage: 'Name',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate(
        'xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.dataViewMatches.actionsColumnName',
        {
          defaultMessage: 'Actions',
        }
      ),
      actions: [
        {
          render: (dataViewInfo: RecognizeModuleResultDataView) => {
            return (
              <EuiButtonEmpty
                isDisabled={false}
                color={'primary'}
                onClick={() => {
                  const url = getUrl(dataViewInfo.id);
                  navigateToUrl(url);
                }}
              >
                <FormattedMessage
                  id="xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.dataViewMatches.createJobAction"
                  defaultMessage="Create {jobsLength, plural, one {# job} other {# jobs}}"
                  values={{ jobsLength }}
                />
              </EuiButtonEmpty>
            );
          },
          'data-test-subj': 'mlSuppliedConfigurationsFlyoutActionCreate',
        },
      ],
      'data-test-subj': 'mlSuppliedConfigurationsFlyoutColumnActions',
    },
  ];

  const sorting = {
    sort: {
      field: 'title',
      direction: 'desc' as const,
    },
  };

  return (
    <EuiInMemoryTable
      data-test-subj="mlSuppliedConfigurationsFlyoutDataViewsTable"
      items={matchingDataViews}
      columns={columns}
      rowProps={(item) => ({
        'data-test-subj': `mlSuppliedConfigurationsDataViewsTableRow row-${item.id}`,
      })}
      pagination={true}
      sorting={sorting}
      tableCaption={i18n.translate(
        'xpack.ml.anomalyDetection.suppliedConfigurationsFlyout.matchedDataViewsTableCaption',
        {
          defaultMessage: 'Data views that match the supplied configuration',
        }
      )}
    />
  );
};
