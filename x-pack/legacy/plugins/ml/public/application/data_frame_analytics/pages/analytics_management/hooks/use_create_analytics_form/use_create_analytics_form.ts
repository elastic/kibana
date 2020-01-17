/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { SimpleSavedObject } from 'src/core/public';
import { ml } from '../../../../../services/ml_api_service';
import { useKibanaContext } from '../../../../../contexts/kibana';

import {
  useRefreshAnalyticsList,
  DataFrameAnalyticsId,
  DataFrameAnalyticsConfig,
} from '../../../../common';

import { ActionDispatchers, ACTION } from './actions';
import { reducer } from './reducer';
import {
  getInitialState,
  getJobConfigFromFormState,
  EsIndexName,
  FormMessage,
  State,
  SourceIndexMap,
} from './state';

export interface CreateAnalyticsFormProps {
  actions: ActionDispatchers;
  state: State;
}

export function getErrorMessage(error: any) {
  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }

  return JSON.stringify(error);
}

export const useCreateAnalyticsForm = (): CreateAnalyticsFormProps => {
  const kibanaContext = useKibanaContext();
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const { refresh } = useRefreshAnalyticsList();

  const { form, jobConfig, isAdvancedEditorEnabled } = state;
  const { createIndexPattern, destinationIndex, jobId } = form;

  const addRequestMessage = (requestMessage: FormMessage) =>
    dispatch({ type: ACTION.ADD_REQUEST_MESSAGE, requestMessage });

  const closeModal = () => dispatch({ type: ACTION.CLOSE_MODAL });

  const resetAdvancedEditorMessages = () =>
    dispatch({ type: ACTION.RESET_ADVANCED_EDITOR_MESSAGES });

  const setIndexNames = (indexNames: EsIndexName[]) =>
    dispatch({ type: ACTION.SET_INDEX_NAMES, indexNames });

  const setAdvancedEditorRawString = (advancedEditorRawString: string) =>
    dispatch({ type: ACTION.SET_ADVANCED_EDITOR_RAW_STRING, advancedEditorRawString });

  const setIndexPatternTitles = (payload: { indexPatternsMap: SourceIndexMap }) =>
    dispatch({ type: ACTION.SET_INDEX_PATTERN_TITLES, payload });

  const setIsJobCreated = (isJobCreated: boolean) =>
    dispatch({ type: ACTION.SET_IS_JOB_CREATED, isJobCreated });

  const setIsJobStarted = (isJobStarted: boolean) => {
    dispatch({ type: ACTION.SET_IS_JOB_STARTED, isJobStarted });
  };

  const setIsModalButtonDisabled = (isModalButtonDisabled: boolean) =>
    dispatch({ type: ACTION.SET_IS_MODAL_BUTTON_DISABLED, isModalButtonDisabled });

  const setIsModalVisible = (isModalVisible: boolean) =>
    dispatch({ type: ACTION.SET_IS_MODAL_VISIBLE, isModalVisible });

  const setJobIds = (jobIds: DataFrameAnalyticsId[]) =>
    dispatch({ type: ACTION.SET_JOB_IDS, jobIds });

  const resetRequestMessages = () => dispatch({ type: ACTION.RESET_REQUEST_MESSAGES });

  const resetForm = () => dispatch({ type: ACTION.RESET_FORM });

  const createAnalyticsJob = async () => {
    resetRequestMessages();
    setIsModalButtonDisabled(true);

    const analyticsJobConfig = isAdvancedEditorEnabled
      ? jobConfig
      : getJobConfigFromFormState(form);

    try {
      await ml.dataFrameAnalytics.createDataFrameAnalytics(jobId, analyticsJobConfig);
      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.stepCreateForm.createDataFrameAnalyticsSuccessMessage',
          {
            defaultMessage: 'Request to create data frame analytics {jobId} acknowledged.',
            values: { jobId },
          }
        ),
      });
      setIsModalButtonDisabled(false);
      setIsJobCreated(true);
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
      setIsModalButtonDisabled(false);
    }
  };

  const createKibanaIndexPattern = async () => {
    const indexPatternName = destinationIndex;

    try {
      const newIndexPattern = await kibanaContext.indexPatterns.make();

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
      setJobIds(
        (await ml.dataFrameAnalytics.getDataFrameAnalytics()).data_frame_analytics.map(
          (job: DataFrameAnalyticsConfig) => job.id
        )
      );
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorGettingDataFrameAnalyticsList',
          {
            defaultMessage: 'An error occurred getting the existing data frame analytics job IDs:',
          }
        ),
      });
    }

    try {
      setIndexNames((await ml.getIndices()).map(index => index.name));
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
      const indexPatternsMap: SourceIndexMap = {};
      const savedObjects = (await kibanaContext.indexPatterns.getCache()) || [];
      savedObjects.forEach((obj: SimpleSavedObject<Record<string, any>>) => {
        const title = obj?.attributes?.title;
        if (title !== undefined) {
          const id = obj?.id || '';
          indexPatternsMap[title] = { label: title, value: id };
        }
      });
      setIndexPatternTitles({
        indexPatternsMap,
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
    setIsModalButtonDisabled(true);
    try {
      const response = await ml.dataFrameAnalytics.startDataFrameAnalytics(jobId);
      if (response.acknowledged !== true) {
        throw new Error(response);
      }
      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.startDataFrameAnalyticsSuccessMessage',
          {
            defaultMessage: 'Request to start data frame analytics {jobId} acknowledged.',
            values: { jobId },
          }
        ),
      });
      setIsJobStarted(true);
      setIsModalButtonDisabled(false);
      refresh();
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorStartingDataFrameAnalyticsJob',
          {
            defaultMessage: 'An error occurred starting the data frame analytics job:',
          }
        ),
      });
      setIsModalButtonDisabled(false);
    }
  };

  const setJobConfig = (payload: Record<string, any>) => {
    dispatch({ type: ACTION.SET_JOB_CONFIG, payload });
  };

  const setFormState = (payload: Partial<State['form']>) => {
    dispatch({ type: ACTION.SET_FORM_STATE, payload });
  };

  const switchToAdvancedEditor = () => {
    dispatch({ type: ACTION.SWITCH_TO_ADVANCED_EDITOR });
  };

  const actions: ActionDispatchers = {
    closeModal,
    createAnalyticsJob,
    openModal,
    resetAdvancedEditorMessages,
    setAdvancedEditorRawString,
    setFormState,
    setIsModalVisible,
    setJobConfig,
    startAnalyticsJob,
    switchToAdvancedEditor,
  };

  return { state, actions };
};
