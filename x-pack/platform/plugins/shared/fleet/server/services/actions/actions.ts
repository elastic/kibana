/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { estypes } from '@elastic/elasticsearch';

import { ES_SEARCH_LIMIT } from '../../../common/constants';

import { FleetActionsError } from '../../../common/errors';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';
import { auditLoggingService } from '../audit_logging';

import {
  validateFilterKueryNode,
  allowedFleetActionsFields,
  ALLOWED_FLEET_ACTIONS_FIELD_TYPES,
} from './utils';

import type { FleetActionRequest, FleetActionResult, BulkCreateResponse } from './types';

const queryOptions = Object.freeze({
  ignore: [404],
});

export const createAction = async (
  esClient: ElasticsearchClient,
  action: FleetActionRequest
): Promise<FleetActionRequest> => {
  try {
    const document = {
      ...action,
      action_id: action.action_id || uuidV4(),
      '@timestamp': action['@timestamp'] || new Date().toISOString(),
    };
    await esClient.create(
      {
        index: AGENT_ACTIONS_INDEX,
        // doc id is same as action_id
        id: document.action_id,
        document,
        refresh: 'wait_for',
      },
      {
        meta: true,
      }
    );

    auditLoggingService.writeCustomAuditLog({
      message: `User created Fleet action [id=${action.action_id}, user_id=${action.user_id}, input_type=${action.input_type}]`,
    });

    return document;
  } catch (createActionError) {
    throw new FleetActionsError(
      `Error creating action: ${createActionError.message}`,
      createActionError
    );
  }
};

const getLoggingInfo = ({
  id,
  actions,
}: {
  id: string;
  actions: FleetActionRequest[];
}): {
  input_type: string;
  user_id: string;
} => {
  const action = actions.find((item) => item.action_id === id);
  return {
    input_type: action?.input_type || '',
    user_id: action?.user_id || '',
  };
};

type BulkCreate = Array<{ create: { _index: string; _id: string } } | FleetActionRequest>;
export const bulkCreateActions = async (
  esClient: ElasticsearchClient,
  _actions: FleetActionRequest[]
): Promise<BulkCreateResponse> => {
  const actions: FleetActionRequest[] = [];
  const bulkCreateActionsOperations = _actions.reduce<BulkCreate>((acc, action) => {
    // doc id is same as action_id
    const actionId = action.action_id || uuidV4();
    acc.push({ create: { _index: AGENT_ACTIONS_INDEX, _id: actionId } });
    const actionDoc = {
      ...action,
      action_id: actionId,
      '@timestamp': action['@timestamp'] || new Date().toISOString(),
    };
    acc.push(actionDoc);
    actions.push(actionDoc);

    return acc;
  }, []);

  try {
    const bulkCreateActionsResponse = (await esClient.bulk({
      operations: bulkCreateActionsOperations,
      refresh: 'wait_for',
    })) as unknown as estypes.BulkResponse;

    const responseItems = bulkCreateActionsResponse.items;

    responseItems.forEach((item) => {
      if (!item.create?.error) {
        const id = item.create?._id ?? '';
        const loggingInfo = getLoggingInfo({ id, actions });
        auditLoggingService.writeCustomAuditLog({
          message: `User created Fleet action [id=${id}, user_id=${loggingInfo.user_id}, input_type=${loggingInfo.input_type}]`,
        });
      }
    });

    const status = responseItems.every((item) => item.create?.error)
      ? 'failed'
      : responseItems.some((item) => item.create?.error)
      ? 'mixed'
      : 'success';

    return {
      status,
      items: responseItems.map((item) => ({
        status: item.create?.error ? 'error' : 'success',
        id: item.create?._id ?? '',
      })),
    };
  } catch (createBulkActionsError) {
    throw new FleetActionsError(
      `Error creating bulk actions: ${createBulkActionsError.message}`,
      createBulkActionsError
    );
  }
};

export const getActionsByIds = async (
  esClient: ElasticsearchClient,
  actionIds: string[]
): Promise<{ items: FleetActionRequest[]; total: number }> => {
  try {
    const getActionsResponse = await esClient.search(
      {
        index: AGENT_ACTIONS_INDEX,
        from: 0,
        size: ES_SEARCH_LIMIT,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  action_id: actionIds,
                },
              },
            ],
          },
        },
      },
      queryOptions
    );

    const actions = getActionsResponse.hits.hits.reduce<FleetActionRequest[]>((acc, hit) => {
      if (hit._source) {
        acc.push(hit._source as FleetActionRequest);
      }
      return acc;
    }, []);

    return {
      items: actions,
      total: actions.length,
    };
  } catch (getActionsByIdError) {
    throw new FleetActionsError(
      `Error getting action: ${getActionsByIdError.message}`,
      getActionsByIdError
    );
  }
};

export const getActionsWithKuery = async (
  esClient: ElasticsearchClient,
  kuery: string
): Promise<{ items: FleetActionRequest[]; total: number }> => {
  const kueryNode = fromKueryExpression(kuery);
  const validationFilterKuery = validateFilterKueryNode({
    astFilter: kueryNode,
    types: ALLOWED_FLEET_ACTIONS_FIELD_TYPES,
    indexMapping: allowedFleetActionsFields,
    indexType: 'actions',
  });

  if (validationFilterKuery.some((obj) => obj.error != null)) {
    const errors = validationFilterKuery
      .reduce<string[]>((acc, item) => {
        if (item.error) {
          acc.push(item.error);
        }
        return acc;
      }, [])
      .join();
    throw new FleetActionsError(`Kuery validation failed: ${errors}`);
  }

  try {
    const query: estypes.QueryDslQueryContainer = toElasticsearchQuery(kueryNode);

    const getActionSearchResponse = await esClient.search(
      {
        index: AGENT_ACTIONS_INDEX,
        from: 0,
        size: ES_SEARCH_LIMIT,
        query,
      },
      queryOptions
    );

    const actions = getActionSearchResponse.hits.hits.reduce<FleetActionRequest[]>((acc, hit) => {
      if (hit._source) {
        acc.push(hit._source as FleetActionRequest);
      }
      return acc;
    }, []);

    return {
      items: actions,
      total: actions.length,
    };
  } catch (getActionSearchError) {
    throw new FleetActionsError(
      `Error getting actions with kuery: ${getActionSearchError.message}`,
      getActionSearchError
    );
  }
};

export const getActionResultsByIds = async (
  esClient: ElasticsearchClient,
  actionIds: string[]
): Promise<{ items: FleetActionResult[]; total: number }> => {
  try {
    const getActionsResultsResponse = await esClient.search(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        from: 0,
        size: ES_SEARCH_LIMIT,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  action_id: actionIds,
                },
              },
            ],
          },
        },
      },
      queryOptions
    );
    const actionsResults = getActionsResultsResponse.hits.hits.reduce<FleetActionResult[]>(
      (acc, hit) => {
        if (hit._source) {
          acc.push(hit._source as FleetActionResult);
        }
        return acc;
      },
      []
    );

    return {
      items: actionsResults,
      total: actionsResults.length,
    };
  } catch (getActionByIdError) {
    throw new FleetActionsError(
      `Error getting action results: ${getActionByIdError.message}`,
      getActionByIdError
    );
  }
};

export const getActionResultsWithKuery = async (
  esClient: ElasticsearchClient,
  kuery: string
): Promise<{ items: FleetActionResult[]; total: number }> => {
  const kueryNode = fromKueryExpression(kuery);
  const validationFilterKuery = validateFilterKueryNode({
    astFilter: kueryNode,
    types: ALLOWED_FLEET_ACTIONS_FIELD_TYPES,
    indexMapping: allowedFleetActionsFields,
    indexType: 'results',
  });

  if (validationFilterKuery.some((obj) => obj.error != null)) {
    const errors = validationFilterKuery
      .reduce<string[]>((acc, item) => {
        if (item.error) {
          acc.push(item.error);
        }
        return acc;
      }, [])
      .join();
    throw new FleetActionsError(`Kuery validation failed: ${errors}`);
  }

  try {
    const query: estypes.QueryDslQueryContainer = toElasticsearchQuery(kueryNode);
    const getActionSearchResponse = await esClient.search(
      {
        index: AGENT_ACTIONS_INDEX,
        from: 0,
        size: ES_SEARCH_LIMIT,
        query,
      },
      queryOptions
    );

    const actionsResults = getActionSearchResponse.hits.hits.reduce<FleetActionResult[]>(
      (acc, hit) => {
        if (hit._source) {
          acc.push(hit._source as FleetActionResult);
        }
        return acc;
      },
      []
    );

    return {
      items: actionsResults,
      total: actionsResults.length,
    };
  } catch (getActionResultsSearchError) {
    throw new FleetActionsError(
      `Error getting action results with kuery: ${getActionResultsSearchError.message}`,
      getActionResultsSearchError
    );
  }
};
