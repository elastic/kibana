/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { ml } from '../../../../../services/ml_api_service';
import { useKibanaContext } from '../../../../../contexts/kibana';

import { useRefreshAnalyticsList, DataFrameAnalyticsOutlierConfig } from '../../../../common';

import {
  getInitialState,
  reducer,
  IndexPatternTitle,
  RequestMessage,
  State,
  ACTION,
} from './reducer';

export interface Actions {
  closeModal: () => void;
  createAnalyticsJob: () => void;
  openModal: () => void;
  startAnalyticsJob: () => void;
  setFormState: (payload: Partial<State>) => void;
}

export interface CreateAnalyticsFormProps {
  actions: Actions;
  formState: State;
}

// List of system fields we want to ignore for the numeric field check.
const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];

function getErrorMessage(error: any) {
  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }

  return JSON.stringify(error);
}

export const useCreateAnalyticsForm = () => {
  const kibanaContext = useKibanaContext();
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const { refresh } = useRefreshAnalyticsList();

  const { createIndexPattern, destinationIndex, jobId, sourceIndex } = state;

  const addRequestMessage = (requestMessage: RequestMessage) =>
    dispatch({ type: ACTION.ADD_REQUEST_MESSAGE, requestMessage });
  const closeModal = () => dispatch({ type: ACTION.CLOSE_MODAL });
  const resetRequestMessages = () => dispatch({ type: ACTION.RESET_REQUEST_MESSAGES });
  const resetForm = () => dispatch({ type: ACTION.RESET_FORM });

  const createAnalyticsJob = async () => {
    resetRequestMessages();
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
      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.stepCreateForm.createDataFrameAnalyticsSuccessMessage',
          {
            defaultMessage: 'Analytics job {jobId} created.',
            values: { jobId },
          }
        ),
      });
      setFormState({ isJobCreated: true, isModalButtonDisabled: false });
      if (createIndexPattern) {
        createKibanaIndexPattern();
      }
      refresh();
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob',
          {
            defaultMessage: 'An error occurred creating the data frame analytics job:',
          }
        ),
      });
      setFormState({
        isModalButtonDisabled: false,
      });
    }
  };

  const createKibanaIndexPattern = async () => {
    const indexPatternName = destinationIndex;

    try {
      const newIndexPattern = await kibanaContext.indexPatterns.get();

      Object.assign(newIndexPattern, {
        id: '',
        title: indexPatternName,
      });

      const id = await newIndexPattern.create();

      // id returns false if there's a duplicate index pattern.
      if (id === false) {
        addRequestMessage({
          error: i18n.translate(
            'xpack.ml.dataframe.analytics.create.duplicateIndexPatternErrorMessageError',
            {
              defaultMessage: 'The index pattern {indexPatternName} already exists.',
              values: { indexPatternName },
            }
          ),
          message: i18n.translate(
            'xpack.ml.dataframe.analytics.create.duplicateIndexPatternErrorMessage',
            {
              defaultMessage: 'An error occurred creating the Kibana index pattern:',
            }
          ),
        });
        return;
      }

      // check if there's a default index pattern, if not,
      // set the newly created one as the default index pattern.
      if (!kibanaContext.kibanaConfig.get('defaultIndex')) {
        await kibanaContext.kibanaConfig.set('defaultIndex', id);
      }

      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.createIndexPatternSuccessMessage',
          {
            defaultMessage: 'Kibana index pattern {indexPatternName} created.',
            values: { indexPatternName },
          }
        ),
      });
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.createIndexPatternErrorMessage',
          {
            defaultMessage: 'An error occurred creating the Kibana index pattern:',
          }
        ),
      });
    }
  };

  const openModal = async () => {
    resetForm();

    // re-fetch existing analytics job IDs and indices for form validation
    try {
      setFormState({
        jobIds: (await ml.dataFrameAnalytics.getDataFrameAnalytics()).data_frame_analytics.map(
          (job: DataFrameAnalyticsOutlierConfig) => job.id
        ),
      });
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorGettingDataFrameAnalyticsList',
          {
            defaultMessage: 'An error occurred getting the existing data frame analytics job Ids:',
          }
        ),
      });
    }

    try {
      setFormState({ indexNames: (await ml.getIndices()).map(index => index.name) });
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorGettingDataFrameIndexNames',
          {
            defaultMessage: 'An error occurred getting the existing index names:',
          }
        ),
      });
    }

    try {
      // Set the index pattern titles which the user can choose as the source.
      setFormState({ indexPatternTitles: await kibanaContext.indexPatterns.getTitles(true) });
      // Find out which index patterns contain numeric fields.
      // This will be used to provide a hint in the form that an analytics jobs is not
      // able to identify outliers if there are no numeric fields present.
      const ids = await kibanaContext.indexPatterns.getIds(true);
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
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorGettingIndexPatternTitles',
          {
            defaultMessage: 'An error occurred getting the existing index pattern titles:',
          }
        ),
      });
    }

    dispatch({ type: ACTION.OPEN_MODAL });
  };

  const startAnalyticsJob = async () => {
    setFormState({ isModalButtonDisabled: true });
    try {
      const response = await ml.dataFrameAnalytics.startDataFrameAnalytics(jobId);
      if (response.acknowledged !== true) {
        throw new Error(response);
      }
      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.startDataFrameAnalyticsSuccessMessage',
          {
            defaultMessage: 'Analytics job {jobId} started.',
            values: { jobId },
          }
        ),
      });
      setFormState({ isJobStarted: true, isModalButtonDisabled: false });
      refresh();
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob',
          {
            defaultMessage: 'An error occurred creating the data frame analytics job:',
          }
        ),
      });
      setFormState({ isModalButtonDisabled: false });
    }
  };

  const setFormState = (payload: Partial<State>) => {
    dispatch({ type: ACTION.SET_FORM_STATE, payload });
  };

  const actions: Actions = {
    closeModal,
    createAnalyticsJob,
    openModal,
    startAnalyticsJob,
    setFormState,
  };

  return { state, actions };
};
