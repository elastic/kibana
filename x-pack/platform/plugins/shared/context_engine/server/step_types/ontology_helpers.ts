/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexItem, AiIndexSource } from '../../common/http_api/ai_indices';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import {
  callConnector,
  resolveConnectorSource,
  type ConnectorActionsClient,
  type ConnectorSourceInfo,
} from '../ontology/connector';
import { ontologySourceId } from '../ontology/ids';
import { formatErrorMessage } from '../utils/format_es_error';
import type { DreamingStepDependencies } from './helpers';

/** What the ontology steps need besides the dreaming step dependencies. */
export interface OntologyStepExtras {
  /** The actions plugin, to read connector sources with. */
  getActions: () => Promise<ActionsPluginStart>;
}

/**
 * The AI index a read-only ontology step works on. Fails when the workflow user cannot read AI
 * indices or the AI index is gone; `undefined` while Context Engine or its memory setting is off,
 * so a run that started before they were turned off reads nothing.
 */
export const getAiIndexForStep = async (
  {
    getAiIndexService,
    isContextEngineEnabled,
    isMemoryEnabled,
    checkReadPrivilege,
  }: DreamingStepDependencies,
  { request, aiIndexId, spaceId }: { request: KibanaRequest; aiIndexId: string; spaceId: string }
): Promise<AiIndexItem | undefined> => {
  if (!(await checkReadPrivilege(request, spaceId))) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'Insufficient privileges to read AI indices',
    });
  }
  if (!(await isContextEngineEnabled(spaceId)) || !(await isMemoryEnabled())) {
    return undefined;
  }
  try {
    return await getAiIndexService().get(aiIndexId, spaceId);
  } catch (error) {
    if (error instanceof AiIndexNotFoundError) {
      throw new ExecutionError({
        type: 'NotFoundError',
        message: `AI index '${aiIndexId}' not found`,
      });
    }
    throw error;
  }
};

/** The source of an AI index with the given id, if it still has one. */
export const findSource = (
  aiIndex: Pick<AiIndexItem, 'sources'>,
  sourceId: string
): AiIndexSource | undefined =>
  aiIndex.sources.find((candidate) => ontologySourceId(candidate) === sourceId);

/** A connector source with an actions client acting as the workflow user. */
export const connectorCallerFor = async (
  getActions: () => Promise<ActionsPluginStart>,
  request: KibanaRequest,
  connectorId: string
): Promise<{
  client: ConnectorActionsClient;
  info: ConnectorSourceInfo;
  verify: (subAction: string, params: unknown) => Promise<boolean>;
}> => {
  const client = await (await getActions()).getActionsClientWithRequest(request);
  let info: ConnectorSourceInfo;
  try {
    info = await resolveConnectorSource(client, connectorId);
  } catch (error) {
    throw new ExecutionError({
      type: 'NotFoundError',
      message: `Connector '${connectorId}' cannot be read: ${formatErrorMessage(error)}`,
    });
  }
  return {
    client,
    info,
    verify: async (subAction, params) => (await callConnector(client, info, subAction, params)).ok,
  };
};
