/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import isDeepEqual from 'fast-deep-equal/react';

import type { IngestPipelineParams } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import {
  FetchDefaultPipelineApiLogic,
  FetchDefaultPipelineResponse,
} from '../../api/connector/get_default_pipeline_api_logic';
import {
  PostDefaultPipelineArgs,
  PostDefaultPipelineResponse,
  UpdateDefaultPipelineApiLogic,
} from '../../api/connector/update_default_pipeline_api_logic';
import { Status } from '../../../common/types/api';
import { Actions } from '../../api/api_logic/create_api_logic';
import { DEFAULT_PIPELINE_VALUES } from '../../../common/constants';

type PipelinesActions = Pick<
  Actions<PostDefaultPipelineArgs, PostDefaultPipelineResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  fetchDefaultPipeline: Actions<undefined, FetchDefaultPipelineResponse>['makeRequest'];
  fetchDefaultPipelineError: Actions<undefined, FetchDefaultPipelineResponse>['apiError'];
  fetchDefaultPipelineSuccess: Actions<undefined, FetchDefaultPipelineResponse>['apiSuccess'];
  setPipeline(pipeline: IngestPipelineParams): {
    pipeline: IngestPipelineParams;
  };
};

interface PipelinesValues {
  defaultPipeline: IngestPipelineParams;
  fetchStatus: Status;
  hasNoChanges: boolean;
  isLoading: boolean;
  pipelineState: IngestPipelineParams & { http?: HttpSetup };
  status: Status;
}

export interface NewConnectorLogicProps {
  http?: HttpSetup;
}

export const SettingsLogic = kea<MakeLogicType<PipelinesValues, PipelinesActions>>({
  key: (props) => props.http,
  actions: {
    setPipeline: (pipeline: IngestPipelineParams) => ({ pipeline }),
  },
  connect: {
    actions: [
      UpdateDefaultPipelineApiLogic,
      ['apiSuccess', 'apiError', 'makeRequest'],
      FetchDefaultPipelineApiLogic,
      [
        'apiError as fetchDefaultPipelineError',
        'apiSuccess as fetchDefaultPipelineSuccess',
        'makeRequest as fetchDefaultPipeline',
      ],
    ],
    values: [
      FetchDefaultPipelineApiLogic,
      ['data as defaultPipeline', 'status as fetchStatus'],
      UpdateDefaultPipelineApiLogic,
      ['status'],
    ],
    keys: [UpdateDefaultPipelineApiLogic, ['http']],
  },
  events: ({ actions, props }) => ({
    afterMount: () => {
      actions.fetchDefaultPipeline(props.http);
    },
  }),
  listeners: ({ actions }) => ({
    apiSuccess: (pipeline) => {
      actions.fetchDefaultPipelineSuccess(pipeline);
    },
    fetchDefaultPipelineSuccess: (pipeline) => {
      actions.setPipeline(pipeline);
    },
  }),
  path: ['content_connectors', 'content', 'settings'],
  reducers: () => ({
    pipelineState: [
      DEFAULT_PIPELINE_VALUES,
      {
        setPipeline: (_, { pipeline }) => pipeline,
      },
    ],
    showModal: [
      false,
      {
        apiSuccess: () => false,
        closeModal: () => false,
        openModal: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    hasNoChanges: [
      () => [selectors.pipelineState, selectors.defaultPipeline],
      (pipelineState: IngestPipelineParams, defaultPipeline: IngestPipelineParams) =>
        isDeepEqual(pipelineState, defaultPipeline),
    ],
    isLoading: [
      () => [selectors.status, selectors.fetchStatus],
      (status, fetchStatus) =>
        [Status.LOADING, Status.IDLE].includes(fetchStatus) || status === Status.LOADING,
    ],
  }),
});
