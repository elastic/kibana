/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';

import { useKibanaContext } from '../../../../../contexts/kibana';
import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';
import { ml } from '../../../../../services/ml_api_service';

import {
  refreshAnalyticsList$,
  useRefreshAnalyticsList,
  DataFrameAnalyticsOutlierConfig,
  REFRESH_ANALYTICS_LIST_STATE,
} from '../../../../common';

import { useCreateAnalyticsForm, IndexPatternTitle } from '../../hooks/use_create_analytics_form';

import { CreateAnalyticsForm } from '../create_analytics_form';
import { CreateAnalyticsModal } from '../create_analytics_modal';

// List of system fields we want to ignore for the numeric field check.
const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];

export const CreateAnalyticsButton: FC = () => {
  const kibanaContext = useKibanaContext();
  const { refresh } = useRefreshAnalyticsList();

  const { state, actions } = useCreateAnalyticsForm();

  const { destinationIndex, isModalVisible, jobId, sourceIndex } = state;

  const { reset, setFormState } = actions;

  const disabled =
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');

  const createAnalyticsJob = async () => {
    setFormState({ isModalButtonDisabled: true });

    const analyticsJobConfig = {
      source: {
        index: sourceIndex,
      },
      dest: {
        index: destinationIndex,
      },
      analysis: {
        outlier_detection: {},
      },
    };

    try {
      await ml.dataFrameAnalytics.createDataFrameAnalytics(jobId, analyticsJobConfig);
      setFormState({ isJobCreated: true, isModalButtonDisabled: false });
      refresh();
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob', {
          defaultMessage: 'An error occurred creating the data frame analytics job: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
      setFormState({ isModalButtonDisabled: false });
    }
  };

  const startAnalyticsJob = async () => {
    setFormState({ isModalButtonDisabled: true });
    try {
      const response = await ml.dataFrameAnalytics.startDataFrameAnalytics(jobId);
      if (response.acknowledged !== true) {
        throw new Error(response);
      }
      setFormState({ isJobStarted: true, isModalButtonDisabled: false });
      refresh();
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob', {
          defaultMessage: 'An error occurred creating the data frame analytics job: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
      setFormState({ isModalButtonDisabled: false });
    }
  };

  const closeModal = () => setFormState({ isModalVisible: false });
  const openModal = async () => {
    reset();

    // re-fetch existing analytics job IDs and indices for form validation
    try {
      setFormState({
        jobIds: (await ml.dataFrameAnalytics.getDataFrameAnalytics()).data_frame_analytics.map(
          (job: DataFrameAnalyticsOutlierConfig) => job.id
        ),
      });
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analytics.create.errorGettingDataFrameAnalyticsList', {
          defaultMessage:
            'An error occurred getting the existing data frame analytics job Ids: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
    }

    try {
      setFormState({ indexNames: (await ml.getIndices()).map(index => index.name) });
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.stepDetailsForm.errorGettingDataFrameIndexNames', {
          defaultMessage: 'An error occurred getting the existing index names: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
    }

    try {
      // Set the index pattern titles which the user can choose as the source.
      setFormState({ indexPatternTitles: await kibanaContext.indexPatterns.getTitles() });
      // Find out which index patterns contain numeric fields.
      // This will be used to provide a hint in the form that an analytics jobs is not
      // able to identify outliers if there are no numeric fields present.
      const ids = await kibanaContext.indexPatterns.getIds();
      const newIndexPatternsWithNumericFields: IndexPatternTitle[] = [];
      ids.forEach(async id => {
        const indexPattern = await kibanaContext.indexPatterns.get(id);
        if (
          indexPattern.fields
            .filter(f => !OMIT_FIELDS.includes(f.name))
            .map(f => f.type)
            .includes('number')
        ) {
          newIndexPatternsWithNumericFields.push(indexPattern.title);
        }
      });
      setFormState({
        indexPatternsWithNumericFields: newIndexPatternsWithNumericFields,
      });
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.stepDetailsForm.errorGettingIndexPatternTitles', {
          defaultMessage: 'An error occurred getting the existing index pattern titles: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
    }

    setFormState({ isModalVisible: true });
  };

  const button = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={openModal}
      iconType="plusInCircle"
      size="s"
      data-test-subj="mlDataFrameAnalyticsButtonCreate"
    >
      {i18n.translate('xpack.ml.dataframe.analyticsList.createDataFrameAnalyticsButton', {
        defaultMessage: 'Create data frame analytics job',
      })}
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canCreateDataFrameAnalytics')}
      >
        {button}
      </EuiToolTip>
    );
  }

  const createAnalyticsModalProps = {
    closeModal,
    createAnalyticsJob,
    isJobCreated: state.isJobCreated,
    isJobStarted: state.isJobStarted,
    isModalButtonDisabled: state.isModalButtonDisabled,
    isValid: state.isValid,
    startAnalyticsJob,
  };

  return (
    <Fragment>
      {button}
      {isModalVisible && (
        <CreateAnalyticsModal {...createAnalyticsModalProps}>
          <CreateAnalyticsForm actions={actions} formState={state} />
        </CreateAnalyticsModal>
      )}
    </Fragment>
  );
};
