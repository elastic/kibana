/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import { CelAuthTypeEnum } from '../../../common/api/model/cel_input_attributes.gen';
import { CelAuthType } from '../../../common';
import type { CelInputState } from '../../types';
import { handleBuildProgram } from './build_program';
import { handleAnalyzeHeaders } from './analyze_headers';
import { handleUpdateProgramHeaderAuth } from './auth_header';
import { handleUpdateProgramBasic } from './auth_basic';
import { handleUpdateProgramOauth2 } from './auth_oauth2';
import { handleRemoveHeadersDigest } from './auth_digest';
import { handleGetStateDetails } from './retrieve_state_details';
import { handleGetStateVariables } from './retrieve_state_vars';
import { handleSummarizeQuery } from './summarize_query';
import { CelInputBaseNodeParams, CelInputGraphParams } from './types';

const graphState: StateGraphArgs<CelInputState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  dataStreamName: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  finalized: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  apiQuerySummary: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  currentProgram: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  hasProgramHeaders: {
    value: (x: boolean | undefined, y?: boolean | undefined) => y ?? x,
    default: () => undefined,
  },
  stateVarNames: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  stateSettings: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  configFields: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  redactVars: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  authType: {
    value: (x: CelAuthType, y?: CelAuthType) => y ?? x,
    default: () => 'header',
  },
  path: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  openApiPathDetails: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  openApiSchemas: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  openApiAuthSchema: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
};

function modelInput({ state }: CelInputBaseNodeParams): Partial<CelInputState> {
  const input = {
    finalized: false,
    lastExecutedChain: 'modelInput',
    path: state.path,
    authType: state.authType,
    openApiPathDetails: state.openApiPathDetails,
    openApiSchemas: state.openApiSchemas,
    openApiAuthSchema: state.openApiAuthSchema,
    dataStreamName: state.dataStreamName,
  };
  return input;
}

function modelOutput({ state }: CelInputBaseNodeParams): Partial<CelInputState> {
  const needsAuthConfigBlock = !state.hasProgramHeaders && state.authType !== 'header';

  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      program: state.currentProgram,
      stateSettings: state.stateSettings,
      configFields: state.configFields,
      redactVars: state.redactVars,
      needsAuthConfigBlock,
    },
  };
}

function headerAuthRouter({ state }: CelInputBaseNodeParams): string {
  if (state.authType === CelAuthTypeEnum.header) {
    return 'headerAuthUpdate';
  }

  return 'analyzeProgramForExistingHeaders';
}

function authRouter({ state }: CelInputBaseNodeParams): string {
  if (state.authType === CelAuthTypeEnum.oauth2 && state.hasProgramHeaders) {
    return 'oauth2Update';
  }
  if (state.authType === CelAuthTypeEnum.basic && state.hasProgramHeaders) {
    return 'basicUpdate';
  }
  if (state.authType === CelAuthTypeEnum.digest && state.hasProgramHeaders) {
    return 'digestUpdate';
  }

  return 'noExistingHeaders';
}

export async function getCelGraph({ model }: CelInputGraphParams) {
  const workflow = new StateGraph({ channels: graphState })
    .addNode('modelInput', (state: CelInputState) => modelInput({ state }))
    .addNode('handleSummarizeQuery', (state: CelInputState) =>
      handleSummarizeQuery({ state, model })
    )
    .addNode('handleBuildProgram', (state: CelInputState) => handleBuildProgram({ state, model }))
    .addNode('handleAnalyzeProgramHeaders', (state: CelInputState) =>
      handleAnalyzeHeaders({ state, model })
    )
    .addNode('handleUpdateProgramHeaderAuth', (state: CelInputState) =>
      handleUpdateProgramHeaderAuth({ state, model })
    )
    .addNode('handleUpdateProgramBasic', (state: CelInputState) =>
      handleUpdateProgramBasic({ state, model })
    )
    .addNode('handleUpdateProgramOauth2', (state: CelInputState) =>
      handleUpdateProgramOauth2({ state, model })
    )
    .addNode('handleRemoveHeadersDigest', (state: CelInputState) =>
      handleRemoveHeadersDigest({ state, model })
    )
    .addNode('handleGetStateVariables', (state: CelInputState) =>
      handleGetStateVariables({ state, model })
    )
    .addNode('handleGetStateDetails', (state: CelInputState) =>
      handleGetStateDetails({ state, model })
    )
    .addNode('modelOutput', (state: CelInputState) => modelOutput({ state }))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('modelInput', 'handleSummarizeQuery')
    .addEdge('handleSummarizeQuery', 'handleBuildProgram')
    .addEdge('handleUpdateProgramHeaderAuth', 'handleGetStateVariables')
    .addEdge('handleUpdateProgramOauth2', 'handleGetStateVariables')
    .addEdge('handleUpdateProgramBasic', 'handleGetStateVariables')
    .addEdge('handleRemoveHeadersDigest', 'handleGetStateVariables')

    .addEdge('handleGetStateVariables', 'handleGetStateDetails')
    .addEdge('handleGetStateDetails', 'modelOutput')
    .addConditionalEdges(
      'handleBuildProgram',
      (state: CelInputState) => headerAuthRouter({ state }),
      {
        headerAuthUpdate: 'handleUpdateProgramHeaderAuth',
        analyzeProgramForExistingHeaders: 'handleAnalyzeProgramHeaders',
      }
    )
    .addConditionalEdges(
      'handleAnalyzeProgramHeaders',
      (state: CelInputState) => authRouter({ state }),
      {
        oauth2Update: 'handleUpdateProgramOauth2',
        basicUpdate: 'handleUpdateProgramBasic',
        digestUpdate: 'handleRemoveHeadersDigest',
        noExistingHeaders: 'handleGetStateVariables',
      }
    );

  const compiledCelGraph = workflow.compile();
  return compiledCelGraph;
}
