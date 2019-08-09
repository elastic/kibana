/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, FC } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';

import { useKibanaContext } from '../../../../../contexts/kibana';
import { isValidIndexName } from '../../../../../../common/util/es_utils';
import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';
import { ml } from '../../../../../services/ml_api_service';

import {
  DataFrameAnalyticsOutlierConfig,
  refreshAnalyticsList$,
  REFRESH_ANALYTICS_LIST_STATE,
  isAnalyticsIdValid,
  DataFrameAnalyticsId,
} from '../../../../common';

import { CreateAnalyticsForm } from '../create_analytics_form';
import { CreateAnalyticsModal } from '../create_analytics_modal';

type EsIndexName = string;
type IndexPatternTitle = string;

// List of system fields we want to ignore.
const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];

export const CreateAnalyticsButton: FC = () => {
  const kibanaContext = useKibanaContext();

  const [isJobCreated, setJobCreated] = useState(false);
  const [isJobStarted, setJobStarted] = useState(false);
  const [isModalButtonDisabled, setModalButtonDisabled] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  const disabled =
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');

  const [jobIds, setJobIds] = useState<DataFrameAnalyticsId[]>([]);
  const [jobId, setJobId] = useState<DataFrameAnalyticsId>('');
  const jobIdExists = jobIds.some(id => jobId === id);
  const jobIdEmpty = jobId === '';
  const jobIdValid = isAnalyticsIdValid(jobId);

  const [indexNames, setIndexNames] = useState<EsIndexName[]>([]);
  const [indexPatternTitles, setIndexPatternTitles] = useState<IndexPatternTitle[]>([]);
  const [indexPatternTitlesWithNumericFields, setIndexPatternTitlesWithNumericfields] = useState<
    IndexPatternTitle[]
  >([]);

  const [sourceIndex, setSourceIndex] = useState<EsIndexName>('');
  const sourceIndexNameExists = indexNames.some(name => sourceIndex === name);
  const sourceIndexNameEmpty = sourceIndex === '';
  const sourceIndexNameValid = isValidIndexName(sourceIndex);

  const [destinationIndex, setDestinationIndex] = useState<EsIndexName>('');
  const destinationIndexNameExists = indexNames.some(name => destinationIndex === name);
  const destinationIndexNameEmpty = destinationIndex === '';
  const destinationIndexNameValid = isValidIndexName(destinationIndex);

  const [createIndexPattern, setCreateIndexPattern] = useState(false);
  const destinationIndexPatternTitleExists = indexPatternTitles.some(
    name => destinationIndex === name
  );

  const valid =
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !sourceIndexNameEmpty &&
    sourceIndexNameValid &&
    !destinationIndexNameEmpty &&
    destinationIndexNameValid &&
    (!destinationIndexPatternTitleExists || !createIndexPattern);

  const createAnalyticsJob = async () => {
    setModalButtonDisabled(true);

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
      const response = await ml.dataFrameAnalytics.createDataFrameAnalytics(
        jobId,
        analyticsJobConfig
      );

      setJobCreated(true);
      setModalButtonDisabled(false);
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob', {
          defaultMessage: 'An error occurred creating the data frame analytics job: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
      setModalButtonDisabled(false);
    }
  };

  const startAnalyticsJob = async () => {
    setModalButtonDisabled(true);
    try {
      const response = await ml.dataFrameAnalytics.startDataFrameAnalytics(jobId);
      if (response.acknowledged !== true) {
        throw new Error(response);
      }
      setJobStarted(true);
      setModalButtonDisabled(false);
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob', {
          defaultMessage: 'An error occurred creating the data frame analytics job: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
      setModalButtonDisabled(false);
    }
  };

  const closeModal = () => setModalVisible(false);
  const openModal = async () => {
    setModalButtonDisabled(false);
    setJobCreated(false);
    setJobStarted(false);
    setJobIds([]);
    setJobId('');
    setIndexNames([]);
    setIndexPatternTitles([]);
    setIndexPatternTitlesWithNumericfields([]);
    setSourceIndex('');
    setDestinationIndex('');
    setCreateIndexPattern(false);

    // re-fetch existing analytics job IDs and indices for form validation
    try {
      setJobIds(
        (await ml.dataFrameAnalytics.getDataFrameAnalytics()).data_frame_analytics.map(
          (job: DataFrameAnalyticsOutlierConfig) => job.id
        )
      );
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
      setIndexNames((await ml.getIndices()).map(index => index.name));
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
      setIndexPatternTitles(await kibanaContext.indexPatterns.getTitles());
      // Find out which index patterns contain numeric fields.
      // This will be used to provide a hint in the form that an analytics jobs is not
      // able to identify outliers if there are no numeric fields present.
      const ids = await kibanaContext.indexPatterns.getIds();
      const newIndexPatternTitlesWithNumericFields: IndexPatternTitle[] = [];
      ids.forEach(async id => {
        const indexPattern = await kibanaContext.indexPatterns.get(id);
        if (
          indexPattern.fields
            .filter(f => !OMIT_FIELDS.includes(f.name))
            .map(f => f.type)
            .includes('number')
        ) {
          newIndexPatternTitlesWithNumericFields.push(indexPattern.title);
        }
      });
      setIndexPatternTitlesWithNumericfields(newIndexPatternTitlesWithNumericFields);
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.stepDetailsForm.errorGettingIndexPatternTitles', {
          defaultMessage: 'An error occurred getting the existing index pattern titles: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
    }

    setModalVisible(true);
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

  return (
    <Fragment>
      {button}
      {isModalVisible && (
        <CreateAnalyticsModal
          closeModal={closeModal}
          createAnalyticsJob={createAnalyticsJob}
          isJobCreated={isJobCreated}
          isJobStarted={isJobStarted}
          isModalButtonDisabled={isModalButtonDisabled}
          startAnalyticsJob={startAnalyticsJob}
          valid={valid}
        >
          <CreateAnalyticsForm
            createIndexPattern={createIndexPattern}
            destinationIndex={destinationIndex}
            destinationIndexNameEmpty={destinationIndexNameEmpty}
            destinationIndexNameExists={destinationIndexNameExists}
            destinationIndexNameValid={destinationIndexNameValid}
            destinationIndexPatternTitleExists={destinationIndexPatternTitleExists}
            indexPatternTitles={indexPatternTitles}
            indexPatternTitlesWithNumericFields={indexPatternTitlesWithNumericFields}
            isJobCreated={isJobCreated}
            jobId={jobId}
            jobIdEmpty={jobIdEmpty}
            jobIdValid={jobIdValid}
            jobIdExists={jobIdExists}
            setCreateIndexPattern={setCreateIndexPattern}
            setDestinationIndex={setDestinationIndex}
            setJobId={setJobId}
            setSourceIndex={setSourceIndex}
            sourceIndex={sourceIndex}
            sourceIndexNameEmpty={sourceIndexNameEmpty}
            sourceIndexNameExists={sourceIndexNameExists}
            sourceIndexNameValid={sourceIndexNameValid}
          />
        </CreateAnalyticsModal>
      )}
    </Fragment>
  );
};
