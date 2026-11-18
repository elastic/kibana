/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { useCreateAndNavigateToManagementMlLink } from '../../../../contexts/kibana/use_create_url';
import { MlAppHeader, useAnomalyDetectionJobsBack } from '../../../../components/ml_app_header';

interface DataSourceOptionProps {
  iconType: string;
  title: string;
  description: string;
  onClick: () => void;
  'data-test-subj': string;
}

const DataSourceOption: FC<DataSourceOptionProps> = ({
  iconType,
  title,
  description,
  onClick,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiPanel hasBorder paddingSize="l" onClick={onClick} data-test-subj={dataTestSubj}>
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon size="xl" type={iconType} aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const noop = () => {};

export const Page: FC = () => {
  const anomalyDetectionJobsBack = useAnomalyDetectionJobsBack();
  const navigateToSelectDataView = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    'anomaly_detection'
  );

  return (
    <div data-test-subj="mlPageDataSourceTypeSelection">
      <MlAppHeader
        title={i18n.translate('xpack.ml.newJob.wizard.selectDataSource.pageTitle', {
          defaultMessage: 'Create an anomaly detection job',
        })}
        back={anomalyDetectionJobsBack}
      />

      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <DataSourceOption
            data-test-subj="mlDataSourceTypeEsqlButton"
            iconType="code"
            title={i18n.translate('xpack.ml.newJob.wizard.selectDataSource.esqlTitle', {
              defaultMessage: 'ES|QL',
            })}
            description={i18n.translate('xpack.ml.newJob.wizard.selectDataSource.esqlDescription', {
              defaultMessage: 'Use an ES|QL query as the source of data for the job.',
            })}
            onClick={noop}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DataSourceOption
            data-test-subj="mlDataSourceTypeDataViewButton"
            iconType="indexPatternApp"
            title={i18n.translate('xpack.ml.newJob.wizard.selectDataSource.dataViewTitle', {
              defaultMessage: 'Data view',
            })}
            description={i18n.translate(
              'xpack.ml.newJob.wizard.selectDataSource.dataViewDescription',
              {
                defaultMessage:
                  'Use a data view or saved Discover session as the source of data for the job.',
              }
            )}
            onClick={navigateToSelectDataView}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
