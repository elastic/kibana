/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import {
  type DataViewSpec,
  SortDirection,
  type EsQuerySortValue,
  type SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { ReportingStart } from '@kbn/reporting-plugin/server';

import { AGENT_API_ROUTES, getSortConfig, removeSOAttributes } from '../../../common';
import type { FleetRequestHandler, PostGenerateAgentsReportRequestSchema } from '../../types';
import { appContextService } from '../../services/app_context';
import { buildAgentStatusRuntimeField } from '../../services/agents/build_status_runtime_field';
import { FleetError } from '../../errors';
import { getSpaceAwarenessFilterForAgents } from '../../services/agents/crud';

type HandleResponseFunc = Parameters<ReportingStart['handleGenerateSystemReportRequest']>[2];

export const generateReportHandler: FleetRequestHandler<
  Record<string, string>,
  null,
  TypeOf<typeof PostGenerateAgentsReportRequestSchema.body>
> = async (context, request, response) => {
  const { agents, fields, timezone, sort } = request.body;
  const fleetContext = await context.fleet;
  const spaceId = fleetContext.spaceId;
  const logger = appContextService.getLogger();

  const runtimeFieldsResult = await buildAgentStatusRuntimeField();
  const runtimeFields = runtimeFieldsResult.status.script?.source ?? 'emit("")';

  const reporting = appContextService.getReportingStart();
  if (!reporting) {
    throw new FleetError('Report generation is not available');
  }

  const reportParams = await getReportParams(
    agents,
    fields,
    runtimeFields,
    spaceId,
    timezone,
    sort
  );
  const handleResponse: HandleResponseFunc = async (result, err?) => {
    if (err) {
      throw err;
    }

    if (!result) {
      throw new FleetError('Report generation encountered an unknown error');
    }

    return response.ok({
      body: {
        url: result.downloadUrl,
      },
    });
  };

  try {
    return await reporting.handleGenerateSystemReportRequest(
      AGENT_API_ROUTES.GENERATE_REPORT_PATTERN,
      {
        request,
        response,
        context,
        reportParams,
      },
      handleResponse
    );
  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    throw new FleetError(`Failed to generate report: ${error.message}`);
  }
};

const VERSION_FIELD = 'local_metadata.elastic.agent.version';
const HOSTNAME_FIELD = 'local_metadata.host.hostname';

export const getSortFieldForAPI = (field: string): string => {
  if ([VERSION_FIELD, HOSTNAME_FIELD].includes(field)) {
    return `${field}.keyword`;
  }
  return field;
};

const getReportParams = async (
  agents: string[] | string,
  fields: string[],
  runtimeFields: string,
  spaceId: string,
  timezone?: string,
  sortOptions?: { field?: string; direction?: string }
) => {
  const index: DataViewSpec = {
    title: '.fleet-agents',
    allowHidden: true,
    runtimeFieldMap: {
      status: {
        type: 'keyword',
        script: {
          source: runtimeFields,
        },
      },
    },
  };

  const agentsQuery = Array.isArray(agents) ? `agent.id:(${agents.join(' OR ')})` : agents;
  const spaceFilter = await getSpaceAwarenessFilterForAgents(spaceId);
  const filterQuery = spaceFilter.length
    ? `${agentsQuery} AND (${spaceFilter.join(' AND ')})`
    : agentsQuery;

  const sortField = getSortFieldForAPI(sortOptions?.field ?? 'enrolled_at');
  const sortOrder = (sortOptions?.direction as SortDirection) ?? SortDirection.desc;

  const sort = getSortConfig(sortField, sortOrder) as EsQuerySortValue[];

  const filterQueryDsl = toElasticsearchQuery(fromKueryExpression(removeSOAttributes(filterQuery)));
  const searchSource: SerializedSearchSourceFields = {
    query: {
      query: '',
      language: 'kuery',
    },
    filter: [
      {
        meta: {
          index: 'fleet-agents',
          params: {},
        },
        query: filterQueryDsl,
      },
    ],
    fields,
    index,
    sort,
  };

  return {
    title: 'Agent List',
    searchSource,
    timezone,
  };
};
