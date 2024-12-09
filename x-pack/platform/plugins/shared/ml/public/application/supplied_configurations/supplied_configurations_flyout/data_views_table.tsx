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

import { useMlKibana, useMlLocator } from '../../contexts/kibana';
import { ML_PAGES } from '../../../../common/constants/locator';
import type {
  RecognizeModuleResult,
  RecognizeModuleResultDataView,
} from '../../../../common/types/modules';

interface Props {
  matchingDataViews: RecognizeModuleResult;
  moduleId: string;
  jobsLength: number;
}

export const DataViewsTable: FC<Props> = ({ matchingDataViews, moduleId, jobsLength }) => {
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const mlLocator = useMlLocator()!;

  const getUrl = useCallback(
    async (id: string) => {
      return await mlLocator.getUrl({
        page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER,
        pageState: {
          id: moduleId,
          index: id,
        },
      });
    },
    [mlLocator, moduleId]
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
                onClick={async () => {
                  const url = await getUrl(dataViewInfo.id);
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
    />
  );
};
